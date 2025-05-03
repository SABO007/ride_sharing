package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"ride_sharing/backend/internal/config"
	"ride_sharing/backend/internal/handlers"
	"ride_sharing/backend/internal/services"

	gorillaHandlers "github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("→ %s %s", r.Method, r.URL.Path)
		log.Printf("Headers: %+v", r.Header)

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

	// Initialize handlers
	rideHandler := handlers.NewRideHandler(db)

	// Initialize Google Places service and handler
	placesService := services.NewGooglePlacesService(cfg.GoogleMapsAPIKey)
	placesHandler := handlers.NewGooglePlacesHandler(placesService)

	// Initialize router
	router := mux.NewRouter()
	router.Use(loggingMiddleware) // Add logging middleware to main router

	// Create API subrouter
	api := router.PathPrefix("/api").Subrouter()

	// Register routes
	api.HandleFunc("/rides", rideHandler.CreateRide).Methods("POST")
	api.HandleFunc("/rides", rideHandler.GetRides).Methods("GET")

	// Create a subrouter for /rides to handle find and ID routes
	ridesRouter := api.PathPrefix("/rides").Subrouter()

	// Register the find route
	ridesRouter.HandleFunc("/find", rideHandler.FindRides).Methods("GET")

	// Then register the ID routes with UUID pattern
	ridesRouter.HandleFunc("/{id:[0-9a-fA-F-]+}", rideHandler.GetRide).Methods("GET")
	ridesRouter.HandleFunc("/{id:[0-9a-fA-F-]+}", rideHandler.UpdateRide).Methods("PUT")
	ridesRouter.HandleFunc("/{id:[0-9a-fA-F-]+}", rideHandler.DeleteRide).Methods("DELETE")

	// Register Google Places autocomplete route
	api.HandleFunc("/places-autocomplete", placesHandler.Autocomplete).Methods("GET")

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
