package models

import "time"

type Booking struct {
    ID              string    `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    RideID          string    `json:"rideId"`
    PassengerID     string    `json:"passengerId"`
    PassengerName   string    `json:"passengerName"`
    ProfilePic      string    `json:"profilePic"`
    From            string    `json:"from"`
    To              string    `json:"to"`
    Date            string    `json:"date"`
    Time            string    `json:"time"`
    Passengers      int       `json:"passengers"`
    SpecialRequests string    `json:"specialRequests,omitempty"`
    Status          string    `json:"status"`
    CreatedAt       time.Time `json:"createdAt"`
    UpdatedAt       time.Time `json:"updatedAt"`
} 