package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"ride_sharing/backend/internal/models"
	"time"

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
	seatsParam := r.URL.Query().Get("seats")
	maxPriceParam := r.URL.Query().Get("maxPrice")

	// Log all search parameters
	log.Printf("Search Parameters:")
	log.Printf("- From: %s", from)
	log.Printf("- To: %s", to)
	log.Printf("- Date: %s", date)
	log.Printf("- Time: %s", timeParam)
	log.Printf("- Seats: %s", seatsParam)
	log.Printf("- MaxPrice: %s", maxPriceParam)

	// Validate required parameters
	if from == "" || to == "" || date == "" {
		http.Error(w, "Missing from, to, or date parameter", http.StatusBadRequest)
		return
	}

	// Validate seats parameter
	var seats int
	if seatsParam != "" {
		if _, err := fmt.Sscanf(seatsParam, "%d", &seats); err != nil {
			http.Error(w, "Invalid seats parameter", http.StatusBadRequest)
			return
		}
		if seats < 1 {
			http.Error(w, "Seats must be at least 1", http.StatusBadRequest)
			return
		}
		log.Printf("Validated seats: %d", seats)
	}

	// Validate maxPrice parameter
	var maxPrice float64
	if maxPriceParam != "" {
		if _, err := fmt.Sscanf(maxPriceParam, "%f", &maxPrice); err != nil {
			http.Error(w, "Invalid maxPrice parameter", http.StatusBadRequest)
			return
		}
		if maxPrice < 0 {
			http.Error(w, "MaxPrice cannot be negative", http.StatusBadRequest)
			return
		}
		log.Printf("Validated maxPrice: %.2f", maxPrice)
	}

	var rides []models.Ride
	query := h.db.Where("\"from\" COLLATE \"C\" = ? AND \"to\" COLLATE \"C\" = ?", from, to)

	var nextDayStr string
	// Handle date filtering for current and next day
	if date != "" {
		// Parse the search date
		searchDate, err := time.Parse("2006-01-02", date)
		if err != nil {
			log.Printf("Error parsing date: %v", err)
			http.Error(w, "Invalid date format", http.StatusBadRequest)
			return
		}

		// Calculate next day
		nextDay := searchDate.AddDate(0, 0, 1)
		nextDayStr = nextDay.Format("2006-01-02")

		// Filter for both current and next day
		query = query.Where("date IN (?, ?)", date, nextDayStr)
		log.Printf("Filtering for dates: %s and %s", date, nextDayStr)
	}

	// Handle time filtering
	if timeParam != "" {
		// For current day: show rides after the search time
		// For next day: show all rides
		query = query.Where("(date = ? AND time >= ?) OR date = ?", date, timeParam, nextDayStr)
		log.Printf("Filtering for time >= %s on current date (%s), all times for next day (%s)", timeParam, date, nextDayStr)
	}

	if seatsParam != "" {
		query = query.Where("seats >= ?", seats)
	}

	if maxPriceParam != "" {
		query = query.Where("price <= ?", maxPrice)
	}

	if err := query.Find(&rides).Error; err != nil {
		log.Printf("Error finding rides: %v", err)
		http.Error(w, "Failed to find rides", http.StatusInternalServerError)
		return
	}

	log.Printf("Found %d rides matching criteria", len(rides))

	// Log details of each matching ride
	for i, ride := range rides {
		log.Printf("\nMatching Ride #%d:", i+1)
		log.Printf("From: %s → To: %s", ride.From, ride.To)
		log.Printf("Date & Time: %s, %s", ride.Date, ride.Time)
		log.Printf("Driver: %s", ride.Driver)
		log.Printf("Available Seats: %d", ride.Seats)
		log.Printf("Price: $%.2f", ride.Price)
		log.Printf("Status: %s", ride.Status)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rides)
}
