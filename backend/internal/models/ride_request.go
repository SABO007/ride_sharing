package models

import "time"

type RideRequest struct {
	ID              string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	RideID          string    `json:"rideId"`
	PassengerID     string    `json:"passengerId"`
	PickupLocation  string    `json:"pickupLocation"`
	DropoffLocation string    `json:"dropoffLocation"`
	Date            string    `json:"date"`
	Time            string    `json:"time"`
	Passengers      int       `json:"passengers"`
	SpecialRequests string    `json:"specialRequests,omitempty"`
	Status          string    `json:"status"` // pending, approved, rejected
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}
