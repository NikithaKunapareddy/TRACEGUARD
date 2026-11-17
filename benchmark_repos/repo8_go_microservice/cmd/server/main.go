package main

import (
	"fmt"
	"net/http"
	"os"
)

// LOOSE_END: Unconfigured environment variable
var servicePort = os.Getenv("SERVICE_PORT")

func main() {
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "OK")
	})
	// LOOSE_END: Commented-out server startup
	// http.ListenAndServe(":"+servicePort, nil)
}
