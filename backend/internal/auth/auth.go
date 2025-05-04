package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"ride_sharing/backend/internal/config"
	"ride_sharing/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"golang.org/x/oauth2/google"
)

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Provider  string    `json:"provider"`
	CreatedAt time.Time `json:"created_at"`
}

type AuthService struct {
	googleConfig   *oauth2.Config
	facebookConfig *oauth2.Config
	jwtSecret      []byte
	userRepo       *models.UserRepository
}

func NewAuthService(config *config.Config, userRepo *models.UserRepository) *AuthService {
	return &AuthService{
		googleConfig: &oauth2.Config{
			ClientID:     config.GoogleClientID,
			ClientSecret: config.GoogleClientSecret,
			RedirectURL:  "http://localhost:8080/auth/google/callback",
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
			Endpoint: google.Endpoint,
		},
		facebookConfig: &oauth2.Config{
			ClientID:     config.FacebookClientID,
			ClientSecret: config.FacebookClientSecret,
			RedirectURL:  "http://localhost:8080/auth/facebook/callback",
			Scopes:       []string{"email", "public_profile"},
			Endpoint:     facebook.Endpoint,
		},
		jwtSecret: []byte(config.JWTSecret),
		userRepo:  userRepo,
	}
}

func (s *AuthService) GenerateToken(user *models.User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":            user.ID,
		"email":         user.Email,
		"name":          user.Name,
		"provider":      user.Provider,
		"profile_image": user.ProfileImage,
		"exp":           time.Now().Add(time.Hour * 24).Unix(),
	})
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) ValidateToken(tokenString string) (*User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return &User{
			ID:       claims["id"].(string),
			Email:    claims["email"].(string),
			Name:     claims["name"].(string),
			Provider: claims["provider"].(string),
		}, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func (s *AuthService) GoogleLogin(c *gin.Context) {
	url := s.googleConfig.AuthCodeURL("state")
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func (s *AuthService) handleOAuthUser(userInfo struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}, provider string, profileImage *string) (*models.User, error) {
	// Check if user exists
	dbUser, err := s.userRepo.GetByEmail(userInfo.Email)
	if err != nil {
		return nil, err
	}

	if dbUser != nil {
		// User exists, return existing user
		return dbUser, nil
	}

	// Create new user
	now := time.Now()
	newUser := &models.User{
		ID:           uuid.New().String(),
		Email:        userInfo.Email,
		Name:         userInfo.Name,
		Provider:     provider,
		ProfileImage: profileImage,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.userRepo.Create(newUser); err != nil {
		return nil, err
	}

	return newUser, nil
}

func (s *AuthService) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	token, err := s.googleConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token"})
		return
	}

	client := s.googleConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode user info"})
		return
	}

	var profileImage *string
	if userInfo.Picture != "" {
		profileImage = &userInfo.Picture
	}
	user, err := s.handleOAuthUser(struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}{
		ID:    userInfo.ID,
		Email: userInfo.Email,
		Name:  userInfo.Name,
	}, "google", profileImage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to handle user"})
		return
	}

	jwtToken, err := s.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Redirect to frontend with token
	frontendURL := "http://localhost:4200/login?token=" + jwtToken
	c.Redirect(http.StatusTemporaryRedirect, frontendURL)
}

func (s *AuthService) FacebookLogin(c *gin.Context) {
	url := s.facebookConfig.AuthCodeURL("state")
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func (s *AuthService) FacebookCallback(c *gin.Context) {
	code := c.Query("code")
	token, err := s.facebookConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token"})
		return
	}

	client := s.facebookConfig.Client(context.Background(), token)
	resp, err := client.Get("https://graph.facebook.com/me?fields=id,name,email")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode user info"})
		return
	}

	pictureURL := fmt.Sprintf("https://graph.facebook.com/%s/picture?type=large", userInfo.ID)
	user, err := s.handleOAuthUser(struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}{userInfo.ID, userInfo.Email, userInfo.Name}, "facebook", &pictureURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to handle user"})
		return
	}

	jwtToken, err := s.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": jwtToken,
		"user":  user,
	})
}

func (s *AuthService) EmailSignup(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		Name     string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if email already exists
	existingUser, err := s.userRepo.GetByEmail(input.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check email"})
		return
	}
	if existingUser != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
		return
	}

	// Hash password
	hashedPassword, err := models.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	now := time.Now()
	user := &models.User{
		ID:        uuid.New().String(),
		Email:     input.Email,
		Name:      input.Name,
		Password:  &hashedPassword,
		Provider:  "email",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.userRepo.Create(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	jwtToken, err := s.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": jwtToken,
		"user": User{
			ID:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			Provider:  user.Provider,
			CreatedAt: user.CreatedAt,
		},
	})
}

func (s *AuthService) EmailLogin(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user from database
	user, err := s.userRepo.GetByEmail(input.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Verify password
	if user.Password == nil || !models.CheckPasswordHash(input.Password, *user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	jwtToken, err := s.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": jwtToken,
		"user": User{
			ID:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			Provider:  user.Provider,
			CreatedAt: user.CreatedAt,
		},
	})
}

// Google Login (Gorilla Mux)
func (s *AuthService) GoogleLoginMux(w http.ResponseWriter, r *http.Request) {
	url := s.googleConfig.AuthCodeURL("state")
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// Google Callback (Gorilla Mux)
func (s *AuthService) GoogleCallbackMux(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	token, err := s.googleConfig.Exchange(r.Context(), code)
	if err != nil {
		http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	client := s.googleConfig.Client(r.Context(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		http.Error(w, "Failed to get user info: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		http.Error(w, "Failed to decode user info: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var profileImage *string
	if userInfo.Picture != "" {
		profileImage = &userInfo.Picture
	}
	user, err := s.handleOAuthUser(struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}{
		ID:    userInfo.ID,
		Email: userInfo.Email,
		Name:  userInfo.Name,
	}, "google", profileImage)
	if err != nil {
		http.Error(w, "Failed to handle user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jwtToken, err := s.GenerateToken(user)
	if err != nil {
		http.Error(w, "Failed to generate token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	frontendURL := "http://localhost:4200/login?token=" + jwtToken
	http.Redirect(w, r, frontendURL, http.StatusTemporaryRedirect)
}

// Facebook Login (Gorilla Mux)
func (s *AuthService) FacebookLoginMux(w http.ResponseWriter, r *http.Request) {
	url := s.facebookConfig.AuthCodeURL("state")
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// Facebook Callback (Gorilla Mux)
func (s *AuthService) FacebookCallbackMux(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	token, err := s.facebookConfig.Exchange(r.Context(), code)
	if err != nil {
		http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	client := s.facebookConfig.Client(r.Context(), token)
	resp, err := client.Get("https://graph.facebook.com/me?fields=id,name,email")
	if err != nil {
		http.Error(w, "Failed to get user info: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		http.Error(w, "Failed to decode user info: "+err.Error(), http.StatusInternalServerError)
		return
	}

	pictureURL := fmt.Sprintf("https://graph.facebook.com/%s/picture?type=large", userInfo.ID)
	user, err := s.handleOAuthUser(struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}{userInfo.ID, userInfo.Email, userInfo.Name}, "facebook", &pictureURL)
	if err != nil {
		http.Error(w, "Failed to handle user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jwtToken, err := s.GenerateToken(user)
	if err != nil {
		http.Error(w, "Failed to generate token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	frontendURL := "http://localhost:4200/login?token=" + jwtToken
	http.Redirect(w, r, frontendURL, http.StatusTemporaryRedirect)
}

// Email Signup (Gorilla Mux)
func (s *AuthService) EmailSignupMux(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	existingUser, err := s.userRepo.GetByEmail(input.Email)
	if err != nil {
		http.Error(w, "Failed to check email", http.StatusInternalServerError)
		return
	}
	if existingUser != nil {
		http.Error(w, "Email already exists", http.StatusBadRequest)
		return
	}

	hashedPassword, err := models.HashPassword(input.Password)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	passwordPtr := &hashedPassword
	now := time.Now()
	user := &models.User{
		ID:        uuid.New().String(),
		Email:     input.Email,
		Name:      input.Name,
		Password:  passwordPtr,
		Provider:  "email",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.userRepo.Create(user); err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	jwtToken, err := s.GenerateToken(user)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"token": jwtToken,
		"user": User{
			ID:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			Provider:  user.Provider,
			CreatedAt: user.CreatedAt,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Email Login (Gorilla Mux)
func (s *AuthService) EmailLoginMux(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	user, err := s.userRepo.GetByEmail(input.Email)
	if err != nil {
		http.Error(w, "Failed to get user", http.StatusInternalServerError)
		return
	}
	if user == nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	if user.Password == nil || !models.CheckPasswordHash(input.Password, *user.Password) {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	jwtToken, err := s.GenerateToken(user)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"token": jwtToken,
		"user": User{
			ID:        user.ID,
			Email:     user.Email,
			Name:      user.Name,
			Provider:  user.Provider,
			CreatedAt: user.CreatedAt,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *AuthService) CreateTable() error {
	return s.userRepo.CreateTable()
}
