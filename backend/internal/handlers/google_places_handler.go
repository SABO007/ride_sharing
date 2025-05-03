package handlers

import (
	"encoding/json"
	"net/http"
	"ride_sharing/backend/internal/services"
)

type GooglePlacesHandler struct {
	placesService *services.GooglePlacesService
}

func NewGooglePlacesHandler(placesService *services.GooglePlacesService) *GooglePlacesHandler {
	return &GooglePlacesHandler{placesService: placesService}
}

func (h *GooglePlacesHandler) Autocomplete(w http.ResponseWriter, r *http.Request) {
	input := r.URL.Query().Get("input")
	if input == "" {
		http.Error(w, "Missing input parameter", http.StatusBadRequest)
		return
	}
	result, err := h.placesService.Autocomplete(input)
	if err != nil {
		http.Error(w, "Failed to fetch suggestions", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
