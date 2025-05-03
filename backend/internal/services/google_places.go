package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

type GooglePlacesService struct {
	APIKey string
}

func NewGooglePlacesService(apiKey string) *GooglePlacesService {
	return &GooglePlacesService{APIKey: apiKey}
}

func (s *GooglePlacesService) Autocomplete(input string) (map[string]interface{}, error) {
	endpoint := "https://maps.googleapis.com/maps/api/place/autocomplete/json"
	params := url.Values{}
	params.Set("input", input)
	params.Set("key", s.APIKey)
	params.Set("types", "geocode")
	params.Set("components", "country:us")

	url := fmt.Sprintf("%s?%s", endpoint, params.Encode())
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}
