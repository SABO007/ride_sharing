package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"ride_sharing/backend/internal/models"
	"ride_sharing/backend/internal/services"

	"github.com/gorilla/mux"
)

type RideHandler struct {
	db *services.Database
}

func NewRideHandler(db *services.Database) *RideHandler {
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
	if err := h.db.CreateRide(&ride); err != nil {
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
	log.Printf("Received GET request for all rides")

	rides, err := h.db.GetRides()
	if err != nil {
		log.Printf("Error getting rides: %v", err)
		http.Error(w, "Failed to get rides", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully retrieved %d rides", len(rides))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rides)
}

func (h *RideHandler) GetRide(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	log.Printf("Received GET request for ride ID: %s", id)

	ride, err := h.db.GetRideByID(id)
	if err != nil {
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
	if err := h.db.UpdateRide(&ride); err != nil {
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

	if err := h.db.DeleteRide(id); err != nil {
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
	log.Printf("Searching for rides")
	if from == "" || to == "" || date == "" {
		http.Error(w, "Missing from, to, or date parameter", http.StatusBadRequest)
		return
	}
	rides, err := h.db.FindRides(from, to, date, timeParam)
	log.Printf("Found %d rides matching criteria", len(rides))
	if err != nil {
		log.Printf("Error finding rides: %v", err)
		http.Error(w, "Failed to find rides", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rides)
}
