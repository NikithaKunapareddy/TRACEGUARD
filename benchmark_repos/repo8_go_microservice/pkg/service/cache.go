package service

// Satisfied interface: RedisCache implements CacheProvider via pointer receiver
type CacheProvider interface {
	Get(key string) ([]byte, error)
	Set(key string, val []byte) error
}

type RedisCache struct {
	addr string
}

func (r *RedisCache) Get(key string) ([]byte, error) {
	return []byte("data"), nil
}

func (r *RedisCache) Set(key string, val []byte) error {
	return nil
}

// GAP: Unimplemented interface with zero concrete implementations
type AuditNotifier interface {
	NotifyAuditViolation(event string, severity int) error
	Flush() error
}
