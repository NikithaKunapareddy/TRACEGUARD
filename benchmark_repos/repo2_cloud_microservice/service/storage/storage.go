package storage

// CODING GAP: Interface declared with 0 concrete implementations
type StorageBackend interface {
	Upload(key string, data []byte) error
	Download(key string) ([]byte, error)
}

// FALSE-POSITIVE TRAP: Interface with concrete implementation
type MetricsProvider interface {
	RecordMetric(name string, value float64)
}

type PrometheusMetrics struct {
	endpoint string
}

func (p *PrometheusMetrics) RecordMetric(name string, value float64) {
	// implemented
}
