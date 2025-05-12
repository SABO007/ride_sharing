package models

import (
	"time"
)

type Ride struct {
	ID          string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	From        string    `json:"from"`
	To          string    `json:"to"`
	Date        string    `json:"date" gorm:"type:date"`
	Time        string    `json:"time" gorm:"type:time without time zone"`
	Price       float64   `json:"price"`
	Seats       int       `json:"seats"`
	Driver      string    `json:"driver"`
	DriverName  string    `json:"driverName"`
	Description string    `json:"description,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Address   string  `json:"address"`
}

// // If you want pickup/drop locations inside Ride:
// PickupLocation Location `gorm:"embedded;embeddedPrefix:pickup_" json:"pickup_location"`
// DropLocation   Location `gorm:"embedded;embeddedPrefix:drop_" json:"drop_location"`
