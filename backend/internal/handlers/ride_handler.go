package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"ride_sharing/backend/internal/models"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

type RideHandler struct {
	db *gorm.DB
}

func NewRideHandler(db *gorm.DB) *RideHandler {
	return &RideHandler{db: db}
}

func (h *RideHandler) CreateRide(w http.ResponseWriter, r *http.Request) {
	log.Printf("Received POST request to create ride")

	var ride models.Ride
	if err := json.NewDecoder(r.Body).Decode(&ride); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate date and time
	if ride.Date == "" {
		http.Error(w, "Date is required", http.StatusBadRequest)
		return
	}
	if ride.Time == "" {
		http.Error(w, "Time is required", http.StatusBadRequest)
		return
	}

	log.Printf("Attempting to create ride: %+v", ride)
	if err := h.db.Create(&ride).Error; err != nil {
		log.Printf("Error creating ride: %v", err)
		http.Error(w, "Failed to create ride", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully created ride with ID: %s", ride.ID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ride)
}

func (h *RideHandler) GetRides(w http.ResponseWriter, r *http.Request) {
	log.Printf("Received GET request for recent rides")

	var rides []models.Ride
	if err := h.db.Order("created_at DESC").Limit(6).Find(&rides).Error; err != nil {
		log.Printf("Error getting recent rides: %v", err)
		http.Error(w, "Failed to get rides", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully retrieved %d recent rides", len(rides))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rides)
}

func (h *RideHandler) GetRide(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	log.Printf("Received GET request for ride ID: %s", id)

	var ride models.Ride
	if err := h.db.First(&ride, "id = ?", id).Error; err != nil {
		log.Printf("Error getting ride %s: %v", id, err)
		http.Error(w, "Ride not found", http.StatusNotFound)
		return
	}

	log.Printf("Successfully retrieved ride: %+v", ride)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ride)
}

func (h *RideHandler) UpdateRide(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	log.Printf("Received PUT request for ride ID: %s", id)

	var ride models.Ride
	if err := json.NewDecoder(r.Body).Decode(&ride); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ride.ID = id
	log.Printf("Attempting to update ride: %+v", ride)
	if err := h.db.Updates(&ride).Error; err != nil {
		log.Printf("Error updating ride %s: %v", id, err)
		http.Error(w, "Failed to update ride", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully updated ride %s", id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ride)
}

func (h *RideHandler) DeleteRide(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	log.Printf("Received DELETE request for ride ID: %s", id)

	if err := h.db.Delete(&models.Ride{}, "id = ?", id).Error; err != nil {
		log.Printf("Error deleting ride %s: %v", id, err)
		http.Error(w, "Failed to delete ride", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully deleted ride %s", id)
	w.WriteHeader(http.StatusNoContent)
}

func (h *RideHandler) FindRides(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	date := r.URL.Query().Get("date")
	timeParam := r.URL.Query().Get("time")
	log.Printf("Searching for rides from %s to %s on %s after %s", from, to, date, timeParam)

	if from == "" || to == "" || date == "" {
		http.Error(w, "Missing from, to, or date parameter", http.StatusBadRequest)
		return
	}

	var rides []models.Ride
	// Use COLLATE "C" for case-sensitive matching in PostgreSQL
	query := h.db.Where("\"from\" COLLATE \"C\" = ? AND \"to\" COLLATE \"C\" = ?", from, to)

	// Add date condition
	if date != "" {
		query = query.Where("date = ?", date)
	}

	// Add time condition if provided
	if timeParam != "" {
		query = query.Where("time >= ?", timeParam)
	}

	if err := query.Find(&rides).Error; err != nil {
		log.Printf("Error finding rides: %v", err)
		http.Error(w, "Failed to find rides", http.StatusInternalServerError)
		return
	}

	log.Printf("Found %d rides matching criteria", len(rides))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rides)
}
