package main

import (
	"fmt"
	"net/http"
)

func main() {
	// LOOSE END: residual debugging print
	fmt.Println("DEBUG: auth token is secret_token_xyz")

	http.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"up"}`))
	})
}
