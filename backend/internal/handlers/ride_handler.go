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

func (h *RideHandler) BookRide(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	rideId := vars["id"]
	log.Printf("Received POST request to book ride ID: %s", rideId)

	// Start a transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		log.Printf("Error starting transaction: %v", tx.Error)
		http.Error(w, "Failed to process booking", http.StatusInternalServerError)
		return
	}

	// Get the ride
	var ride models.Ride
	if err := tx.First(&ride, "id = ?", rideId).Error; err != nil {
		tx.Rollback()
		log.Printf("Error finding ride: %v", err)
		http.Error(w, "Ride not found", http.StatusNotFound)
		return
	}

	var booking models.Booking
	if err := json.NewDecoder(r.Body).Decode(&booking); err != nil {
		tx.Rollback()
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// IMPORTANT: Check if user is trying to book their own ride
	if booking.PassengerID == ride.Driver {
		tx.Rollback()
		log.Printf("Blocked attempt to book own ride: PassengerID %s matches Driver %s", booking.PassengerID, ride.Driver)
		http.Error(w, "You cannot book your own ride", http.StatusForbidden)
		return
	}

	// Check if ride is available
	if ride.Status != "available" {
		tx.Rollback()
		http.Error(w, "Ride is not available", http.StatusBadRequest)
		return
	}

	// Validate number of seats and provide helpful message
	if booking.Passengers > ride.Seats {
		tx.Rollback()
		response := map[string]interface{}{
			"error":           fmt.Sprintf("Not enough seats available. Only %d seats are available for this ride.", ride.Seats),
			"available_seats": ride.Seats,
			"requested_seats": booking.Passengers,
			"excess_seats":    booking.Passengers - ride.Seats,
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Set booking details
	booking.RideID = rideId
	booking.Status = "confirmed"
	booking.CreatedAt = time.Now()
	booking.UpdatedAt = time.Now()

	// Create the booking
	if err := tx.Create(&booking).Error; err != nil {
		tx.Rollback()
		log.Printf("Error creating booking: %v", err)
		http.Error(w, "Failed to create booking", http.StatusInternalServerError)
		return
	}

	// Update ride seats
	remainingSeats := ride.Seats - booking.Passengers
	log.Printf("Updating ride seats: %d - %d = %d", ride.Seats, booking.Passengers, remainingSeats)

	if remainingSeats <= 0 {
		// Move ride to history
		rideHistory := models.RideHistory{
			RideID:      ride.ID,
			From:        ride.From,
			To:          ride.To,
			Date:        ride.Date,
			Time:        ride.Time,
			Price:       ride.Price,
			Seats:       0,
			Driver:      ride.Driver,
			DriverName:  ride.DriverName,
			Description: ride.Description,
			Status:      "completed",
			CreatedAt:   ride.CreatedAt,
			UpdatedAt:   ride.UpdatedAt,
			CompletedAt: time.Now(),
		}

		if err := tx.Create(&rideHistory).Error; err != nil {
			tx.Rollback()
			log.Printf("Error creating ride history: %v", err)
			http.Error(w, "Failed to process booking", http.StatusInternalServerError)
			return
		}

		if err := tx.Delete(&ride).Error; err != nil {
			tx.Rollback()
			log.Printf("Error deleting ride: %v", err)
			http.Error(w, "Failed to process booking", http.StatusInternalServerError)
			return
		}
	} else {
		ride.Seats = remainingSeats
		if err := tx.Save(&ride).Error; err != nil {
			tx.Rollback()
			log.Printf("Error updating ride: %v", err)
			http.Error(w, "Failed to process booking", http.StatusInternalServerError)
			return
		}
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to process booking", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully processed booking for ride %s", rideId)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(booking)
}

func (h *RideHandler) CreateRideRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	rideId := vars["id"]
	log.Printf("Received POST request to create ride request for ride ID: %s", rideId)

	// Start a transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		log.Printf("Error starting transaction: %v", tx.Error)
		http.Error(w, "Failed to process request", http.StatusInternalServerError)
		return
	}

	// Get the ride
	var ride models.Ride
	if err := tx.First(&ride, "id = ?", rideId).Error; err != nil {
		tx.Rollback()
		log.Printf("Error finding ride: %v", err)
		http.Error(w, "Ride not found", http.StatusNotFound)
		return
	}

	// Check if ride is available
	if ride.Status != "available" {
		tx.Rollback()
		http.Error(w, "Ride is not available", http.StatusBadRequest)
		return
	}

	var request models.RideRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		tx.Rollback()
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Log the full request details
	requestJSON, _ := json.MarshalIndent(request, "", "  ")
	log.Printf("Ride request details:\n%s", string(requestJSON))

	// Check if required fields are provided
	if request.PassengerName == "" {
		log.Printf("Warning: PassengerName not provided in request")
	}
	if request.ProfilePic == "" {
		log.Printf("Warning: ProfilePic not provided in request")
	}
	if request.From == "" {
		log.Printf("Warning: From location not provided in request")
	}
	if request.To == "" {
		log.Printf("Warning: To location not provided in request")
	}

	// Validate number of seats
	if request.Passengers > ride.Seats {
		tx.Rollback()
		http.Error(w, "Not enough seats available", http.StatusBadRequest)
		return
	}

	// Set request details
	request.RideID = rideId
	request.Status = "pending"
	request.CreatedAt = time.Now()
	request.UpdatedAt = time.Now()

	// Create the request
	if err := tx.Create(&request).Error; err != nil {
		tx.Rollback()
		log.Printf("Error creating ride request: %v", err)
		http.Error(w, "Failed to create ride request", http.StatusInternalServerError)
		return
	}

	// Log the saved request details
	log.Printf("Successfully created ride request for ride %s with the following details:", rideId)
	log.Printf("PassengerID: %s", request.PassengerID)
	log.Printf("PassengerName: %s", request.PassengerName)
	log.Printf("ProfilePic: %s", request.ProfilePic)
	log.Printf("From: %s", request.From)
	log.Printf("To: %s", request.To)
	log.Printf("Date: %s", request.Date)
	log.Printf("Time: %s", request.Time)
	log.Printf("Passengers: %d", request.Passengers)
	log.Printf("Special Requests: %s", request.SpecialRequests)

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to process request", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(request)
}

func (h *RideHandler) HandleRideRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	requestId := vars["requestId"]
	log.Printf("Received PUT request to handle ride request ID: %s", requestId)

	var input struct {
		Status string `json:"status"` // "approved" or "rejected"
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if input.Status != "approved" && input.Status != "rejected" {
		http.Error(w, "Invalid status", http.StatusBadRequest)
		return
	}

	// Start a transaction
	tx := h.db.Begin()
	if tx.Error != nil {
		log.Printf("Error starting transaction: %v", tx.Error)
		http.Error(w, "Failed to process request", http.StatusInternalServerError)
		return
	}

	// Get the request
	var request models.RideRequest
	if err := tx.First(&request, "id = ?", requestId).Error; err != nil {
		tx.Rollback()
		log.Printf("Error finding request: %v", err)
		http.Error(w, "Request not found", http.StatusNotFound)
		return
	}

	// Check if request is already handled
	if request.Status != "pending" {
		tx.Rollback()
		http.Error(w, "Request already handled", http.StatusBadRequest)
		return
	}

	// Update request status
	request.Status = input.Status
	request.UpdatedAt = time.Now()

	if input.Status == "approved" {
		// Get the ride
		var ride models.Ride
		if err := tx.First(&ride, "id = ?", request.RideID).Error; err != nil {
			tx.Rollback()
			log.Printf("Error finding ride: %v", err)
			http.Error(w, "Ride not found", http.StatusNotFound)
			return
		}

		// Update ride seats
		remainingSeats := ride.Seats - request.Passengers
		if remainingSeats <= 0 {
			// Move ride to history
			rideHistory := models.RideHistory{
				RideID:      ride.ID,
				From:        ride.From,
				To:          ride.To,
				Date:        ride.Date,
				Time:        ride.Time,
				Price:       ride.Price,
				Seats:       0,
				Driver:      ride.Driver,
				DriverName:  ride.DriverName,
				Description: ride.Description,
				Status:      "completed",
				CreatedAt:   ride.CreatedAt,
				UpdatedAt:   ride.UpdatedAt,
				CompletedAt: time.Now(),
			}

			if err := tx.Create(&rideHistory).Error; err != nil {
				tx.Rollback()
				log.Printf("Error creating ride history: %v", err)
				http.Error(w, "Failed to process request", http.StatusInternalServerError)
				return
			}

			// Delete the ride
			if err := tx.Delete(&ride).Error; err != nil {
				tx.Rollback()
				log.Printf("Error deleting ride: %v", err)
				http.Error(w, "Failed to process request", http.StatusInternalServerError)
				return
			}
		} else {
			// Update the ride
			ride.Seats = remainingSeats
			if err := tx.Save(&ride).Error; err != nil {
				tx.Rollback()
				log.Printf("Error updating ride: %v", err)
				http.Error(w, "Failed to process request", http.StatusInternalServerError)
				return
			}
		}

		// Create the booking
		booking := models.Booking{
			RideID:        request.RideID,
			PassengerID:   request.PassengerID,
			PassengerName: request.PassengerName,
			ProfilePic:    request.ProfilePic,
			From:          request.From,
			To:            request.To,
			Date:            request.Date,
			Time:            request.Time,
			Passengers:      request.Passengers,
			SpecialRequests: request.SpecialRequests,
			Status:          "confirmed",
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		if err := tx.Create(&booking).Error; err != nil {
			tx.Rollback()
			log.Printf("Error creating booking: %v", err)
			http.Error(w, "Failed to process request", http.StatusInternalServerError)
			return
		}
	}

	// Save the updated request
	if err := tx.Save(&request).Error; err != nil {
		tx.Rollback()
		log.Printf("Error updating request: %v", err)
		http.Error(w, "Failed to process request", http.StatusInternalServerError)
		return
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Error committing transaction: %v", err)
		http.Error(w, "Failed to process request", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully handled ride request %s", requestId)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(request)
}

func (h *RideHandler) GetPendingRequests(w http.ResponseWriter, r *http.Request) {
	log.Printf("Received GET request for pending ride requests")

	var requests []models.RideRequest
	if err := h.db.Where("status = ?", "pending").Order("created_at DESC").Find(&requests).Error; err != nil {
		log.Printf("Error getting pending requests: %v", err)
		http.Error(w, "Failed to get pending requests", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully retrieved %d pending requests", len(requests))
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(requests); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
