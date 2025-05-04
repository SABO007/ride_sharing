package auth

import (
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, authService *AuthService) {
	auth := r.Group("/auth")
	{
		// Google OAuth routes
		auth.GET("/google/login", authService.GoogleLogin)
		auth.GET("/google/callback", authService.GoogleCallback)

		// Facebook OAuth routes
		auth.GET("/facebook/login", authService.FacebookLogin)
		auth.GET("/facebook/callback", authService.FacebookCallback)

		// Email routes
		auth.POST("/email/signup", authService.EmailSignup)
		auth.POST("/email/login", authService.EmailLogin)
	}
}
