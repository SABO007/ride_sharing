package models

import "time"

type Ride struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	From        string    `json:"from"`
	To          string    `json:"to"`
	Date        string    `json:"date" gorm:"type:date"`
	Time        string    `json:"time" gorm:"type:time"`
	Price       float64   `json:"price"`
	Seats       int       `json:"seats"`
	Driver      string    `json:"driver"`
	Description string    `json:"description,omitempty"`
	Status      string    `json:"status"` // "available", "booked", "completed"
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Address   string  `json:"address"`
}
