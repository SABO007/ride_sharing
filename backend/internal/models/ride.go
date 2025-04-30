package models

import "time"

type Ride struct {
	ID          string    `json:"id"`
	DriverID    string    `json:"driver_id"`
	Source      Location  `json:"source"`
	Destination Location  `json:"destination"`
	Status      string    `json:"status"` // "available", "booked", "completed"
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Address   string  `json:"address"`
} 