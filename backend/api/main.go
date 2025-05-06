package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"ride_sharing/backend/internal/auth"
	"ride_sharing/backend/internal/config"
	"ride_sharing/backend/internal/handlers"
	"ride_sharing/backend/internal/models"
	"ride_sharing/backend/internal/services"

	gorillaHandlers "github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("→ %s %s", r.Method, r.URL.Path)

		start := time.Now()
		next.ServeHTTP(w, r)

		log.Printf("← Completed %s %s in %v", r.Method, r.URL.Path, time.Since(start))
	})
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("Starting server initialization...")

	// Load configuration
	cfg := config.LoadConfig()

	// Initialize database
	db, err := services.NewDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize user repository
	userRepo := models.NewUserRepository(db.DB)
	if err := userRepo.CreateTable(); err != nil {
		log.Fatalf("Failed to migrate user table: %v", err)
	}

	// Initialize handlers
	rideHandler := handlers.NewRideHandler(db.DB)

	// Initialize Google Places service and handler
	placesService := services.NewGooglePlacesService(cfg.GoogleMapsAPIKey)
	placesHandler := handlers.NewGooglePlacesHandler(placesService)

	// Initialize auth service
	authService := auth.NewAuthService(cfg, userRepo)

	// Initialize router
	router := mux.NewRouter()
	router.Use(loggingMiddleware) // Add logging middleware to main router

	// Register routes on the root router (no /api prefix)
	router.HandleFunc("/rides", rideHandler.CreateRide).Methods("POST")
	router.HandleFunc("/rides", rideHandler.GetRides).Methods("GET")

	// Footer links
	router.HandleFunc("/about", handlers.AboutHandler).Methods("GET")
	router.HandleFunc("/contact", handlers.ContactHandler).Methods("GET")
	router.HandleFunc("/safety", handlers.PrivacyHandler).Methods("GET")

	ridesRouter := router.PathPrefix("/rides").Subrouter()
	ridesRouter.HandleFunc("/find", rideHandler.FindRides).Methods("GET")
	ridesRouter.HandleFunc("/{id:[0-9a-fA-F-]+}", rideHandler.GetRide).Methods("GET")
	ridesRouter.HandleFunc("/{id:[0-9a-fA-F-]+}", rideHandler.UpdateRide).Methods("PUT")
	ridesRouter.HandleFunc("/{id:[0-9a-fA-F-]+}", rideHandler.DeleteRide).Methods("DELETE")

	router.HandleFunc("/places-autocomplete", placesHandler.Autocomplete).Methods("GET")

	router.HandleFunc("/auth/google/login", authService.GoogleLoginMux).Methods("GET")
	router.HandleFunc("/auth/google/callback", authService.GoogleCallbackMux).Methods("GET")
	router.HandleFunc("/auth/facebook/login", authService.FacebookLoginMux).Methods("GET")
	router.HandleFunc("/auth/facebook/callback", authService.FacebookCallbackMux).Methods("GET")
	router.HandleFunc("/auth/email/signup", authService.EmailSignupMux).Methods("POST")
	router.HandleFunc("/auth/email/login", authService.EmailLoginMux).Methods("POST")

	// Add CORS middleware
	corsMiddleware := gorillaHandlers.CORS(
		gorillaHandlers.AllowedOrigins([]string{"http://localhost:4200"}), // Standard Angular port
		gorillaHandlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		gorillaHandlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)

	// Create final handler chain
	handler := corsMiddleware(router)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("API endpoint: http://localhost:%s/api", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}
