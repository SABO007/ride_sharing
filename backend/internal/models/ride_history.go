package models

import "time"

type RideHistory struct {
	ID          string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	RideID      string    `json:"rideId"`
	From        string    `json:"from"`
	To          string    `json:"to"`
	Date        string    `json:"date"`
	Time        string    `json:"time"`
	Price       float64   `json:"price"`
	Seats       int       `json:"seats"`
	Driver      string    `json:"driver"`
	DriverName  string    `json:"driverName"`
	Description string    `json:"description,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	CompletedAt time.Time `json:"completedAt"`
}
