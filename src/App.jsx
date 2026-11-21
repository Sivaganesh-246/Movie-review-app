import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase.js'
import './App.css'

const seedMovies = [
  { id: 1, title: 'The Last Horizon', genre: 'Sci-Fi', year: 2026, duration: '2h 14m', director: 'Elena Park', description: 'A lone cartographer follows a signal beyond the edge of the known universe.', accent: '#6f7dfb', symbol: 'LH' },
  { id: 2, title: 'Midnight in Kyoto', genre: 'Drama', year: 2025, duration: '1h 48m', director: 'Kenji Mori', description: 'Two strangers find an unexpected connection during one sleepless night.', accent: '#e06f91', symbol: 'MK' },
  { id: 3, title: 'The Paper Trail', genre: 'Thriller', year: 2024, duration: '2h 02m', director: 'Maya Reynolds', description: 'An investigative reporter uncovers a secret hidden in an old archive.', accent: '#d19b55', symbol: 'PT' },
  { id: 4, title: 'Wildflower State', genre: 'Adventure', year: 2026, duration: '1h 56m', director: 'Theo Bennett', description: 'A fractured family crosses the wilderness to rediscover what matters.', accent: '#6ba979', symbol: 'WS' },
]

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function App() {
  const [portal, setPortal] = useState('reviewer')
  const [movies, setMovies] = useState(() => readStorage('mra-movies', seedMovies))
  const [reviews, setReviews] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => localStorage.setItem('mra-movies', JSON.stringify(movies)), [movies])

  useEffect(() => {
    async function loadSupabaseData() {
      const { data: dbMovies, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .order('id')

      if (movieError) {
        console.error('Could not load movies:', movieError)
      } else if (dbMovies?.length) {
        setMovies(dbMovies)
      }

      const { data: dbReviews, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })

      if (reviewError) {
        console.error('Could not load reviews:', reviewError)
      } else {
        setReviews((dbReviews || []).map((review) => ({
          ...review,
          createdAt: review.created_at,
          movieTitle: review.movie_title,
          movieId: review.movie_id,
        })))
      }
    }

    loadSupabaseData()

    const channel = supabase
      .channel('review-submissions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
        const review = payload.new
        setReviews((current) => [{
          ...review,
          createdAt: review.created_at,
          movieTitle: review.movie_title,
          movieId: review.movie_id,
        }, ...current.filter((item) => item.id !== review.id)])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPortal('reviewer')} aria-label="Go to reviewer portal">
          <span className="brand-mark">M</span>
          <span>MovieScope</span>
        </button>
        <nav className="portal-switch" aria-label="Choose portal">
          <button className={portal === 'reviewer' ? 'active' : ''} onClick={() => setPortal('reviewer')}>Reviewer</button>
          <button className={portal === 'admin' ? 'active' : ''} onClick={() => setPortal('admin')}>Admin</button>
        </nav>
      </header>

      {portal === 'reviewer' ? (
        <Reviewer movies={movies} onRate={setSelectedMovie} />
      ) : (
        <Admin movies={movies} setMovies={setMovies} reviews={reviews} />
      )}

      {selectedMovie && (
        <ReviewModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onSubmit={async (review) => {
            const { data, error } = await supabase
              .from('reviews')
              .insert({
                movie_id: selectedMovie.id,
                movie_title: selectedMovie.title,
                name: review.name,
                age: Number(review.age),
                gender: review.gender,
                location: review.location,
                rating: review.rating,
              })
              .select()
              .single()

            if (error) {
              console.error('Could not submit review:', error)
              showToast(`Review not saved: ${error.message}`)
              return
            }

            const savedReview = {
              ...data,
              createdAt: data.created_at,
              movieTitle: data.movie_title,
              movieId: data.movie_id,
            }
            setReviews((current) => [savedReview, ...current])
            setSelectedMovie(null)
            showToast('Your review has been submitted')
          }}
        />
      )}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </div>
  )
}

function Reviewer({ movies, onRate }) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All')
  const genres = ['All', ...new Set(movies.map((movie) => movie.genre))]
  const visible = movies.filter((movie) => (
    (genre === 'All' || movie.genre === genre) &&
    `${movie.title} ${movie.director}`.toLowerCase().includes(query.toLowerCase())
  ))

  return (
    <main>
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Now showing</span>
          <h1>Find your next<br /><em>favorite film.</em></h1>
          <p>Discover new releases and share your honest take.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="orb orb-one" /><span className="orb orb-two" />
          <div className="ticket"><span>NOW</span><strong>PLAYING</strong><small>ADMIT TWO</small></div>
        </div>
      </section>

      <section className="catalog">
        <div className="section-heading">
          <div><span className="eyebrow">Explore</span><h2>Movies</h2></div>
          <div className="catalog-tools">
            <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies" /></label>
            <select value={genre} onChange={(event) => setGenre(event.target.value)} aria-label="Filter by genre">
              {genres.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>

        {visible.length ? (
          <div className="movie-grid">
            {visible.map((movie) => <MovieCard key={movie.id} movie={movie} onRate={onRate} />)}
          </div>
        ) : <div className="empty-state">No movies match your search.</div>}
      </section>
    </main>
  )
}

function MovieCard({ movie, onRate }) {
  return (
    <article className="movie-card">
      <div className="poster" style={{ '--poster': movie.accent || '#777' }}>
        <span className="poster-genre">{movie.genre}</span>
        <strong>{movie.symbol || movie.title.slice(0, 2).toUpperCase()}</strong>
        <span className="poster-lines"><i /><i /><i /></span>
      </div>
      <div className="movie-info">
        <div className="movie-meta"><span>{movie.year}</span><i /> <span>{movie.duration}</span></div>
        <h3>{movie.title}</h3>
        <p className="director">Directed by {movie.director}</p>
        <p className="description">{movie.description}</p>
        <button className="rate-button" onClick={() => onRate(movie)}>Rate this movie <span>→</span></button>
      </div>
    </article>
  )
}

function ReviewModal({ movie, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', age: '', gender: '', location: '', rating: 0 })
  const [error, setError] = useState('')

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }

  function submit(event) {
    event.preventDefault()
    if (!form.name.trim() || !form.age || !form.gender || !form.location.trim() || !form.rating) {
      setError('Please complete every field and choose a rating.')
      return
    }
    onSubmit({ ...form, age: Number(form.age) })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="eyebrow">Review</span>
        <h2 id="review-title">{movie.title}</h2>
        <form onSubmit={submit}>
          <div className="field-grid">
            <label>Name<input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" /></label>
            <label>Age<input type="number" min="1" max="120" value={form.age} onChange={(e) => update('age', e.target.value)} placeholder="Your age" /></label>
            <label>Gender<select value={form.gender} onChange={(e) => update('gender', e.target.value)}><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label>
            <label>Location<input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="City, Country" /></label>
          </div>
          <fieldset className="rating-field"><legend>Rating</legend><div className="stars">
            {[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} className={star <= form.rating ? 'selected' : ''} onClick={() => update('rating', star)} aria-label={`${star} stars`}>★</button>)}
          </div></fieldset>
          {error && <p className="form-error">{error}</p>}
          <button className="submit-button" type="submit">Submit review</button>
        </form>
      </section>
    </div>
  )
}

function Admin({ movies, setMovies, reviews }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState('reviews')

  function login(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (data.get('username') === 'admin' && data.get('password') === 'admin123') {
      setAuthenticated(true); setLoginError('')
    } else setLoginError('Invalid username or password')
  }

  if (!authenticated) return (
    <main className="login-layout"><section className="login-panel">
      <div className="login-icon">M</div><span className="eyebrow">Secure portal</span><h1>Admin login</h1><p>Sign in to manage movies and reviews.</p>
      <form onSubmit={login}>
        <label>Username<input name="username" placeholder="Enter username" /></label>
        <label>Password<input name="password" type="password" placeholder="Enter password" /></label>
        {loginError && <p className="form-error">{loginError}</p>}
        <button className="submit-button" type="submit">Sign in <span>→</span></button>
      </form>
    </section></main>
  )

  return <main className="admin-layout">
    <aside className="admin-sidebar">
      <span className="eyebrow">Administration</span>
      <h2>Dashboard</h2>
      <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}><span>◫</span> Reviews</button>
      <button className={tab === 'movies' ? 'active' : ''} onClick={() => setTab('movies')}><span>▣</span> Movies</button>
      <button className="logout" onClick={() => setAuthenticated(false)}><span>↪</span> Sign out</button>
    </aside>
    <section className="admin-content">
      {tab === 'reviews' ? <ReviewDashboard reviews={reviews} movies={movies} /> : <MovieDashboard movies={movies} onAddMovie={async (movie) => {
        const { data, error } = await supabase
          .from('movies')
          .insert(movie)
          .select()
          .single()

        if (error) return false
        setMovies((current) => [...current, data])
        return true
      }} />}
    </section>
  </main>
}

function ReviewDashboard({ reviews, movies }) {
  const [filters, setFilters] = useState({ search: '', movie: 'All', gender: 'All', rating: 'All', location: '' })
  const filtered = useMemo(() => reviews.filter((review) => (
    (!filters.search || review.name.toLowerCase().includes(filters.search.toLowerCase())) &&
    (filters.movie === 'All' || review.movieTitle === filters.movie) &&
    (filters.gender === 'All' || review.gender === filters.gender) &&
    (filters.rating === 'All' || review.rating === Number(filters.rating)) &&
    (!filters.location || review.location.toLowerCase().includes(filters.location.toLowerCase()))
  )), [reviews, filters])

  return <>
    <div className="admin-heading"><div><span className="eyebrow">Insights</span><h1>Movie reviews</h1></div><div className="review-count"><strong>{reviews.length}</strong><span>Total reviews</span></div></div>
    <div className="filter-bar">
      <label className="search-box"><span>⌕</span><input placeholder="Search by reviewer" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} /></label>
      <select value={filters.movie} onChange={(e) => setFilters({...filters, movie: e.target.value})}><option>All</option>{movies.map((movie) => <option key={movie.id}>{movie.title}</option>)}</select>
      <select value={filters.gender} onChange={(e) => setFilters({...filters, gender: e.target.value})}><option>All</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select>
      <select value={filters.rating} onChange={(e) => setFilters({...filters, rating: e.target.value})}><option>All</option>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} star{rating > 1 ? 's' : ''}</option>)}</select>
      <input className="location-filter" placeholder="Filter location" value={filters.location} onChange={(e) => setFilters({...filters, location: e.target.value})} />
    </div>
    {filtered.length ? <div className="review-table-wrap"><table><thead><tr><th>Reviewer</th><th>Movie</th><th>Rating</th><th>Location</th><th>Details</th></tr></thead><tbody>{filtered.map((review) => <tr key={review.id}><td><strong>{review.name}</strong><small>{review.gender}, {review.age}</small></td><td>{review.movieTitle}</td><td><span className="table-rating">★ {review.rating}.0</span></td><td>{review.location}</td><td><small>{new Date(review.createdAt).toLocaleDateString()}</small></td></tr>)}</tbody></table></div> : <div className="empty-state admin-empty">No reviews found for these filters.</div>}
  </>
}

function MovieDashboard({ movies, onAddMovie }) {
  const [form, setForm] = useState({ title: '', genre: '', year: '', duration: '', director: '', description: '' })

  async function addMovie(event) {
    event.preventDefault()
    if (!form.title.trim()) return

    const saved = await onAddMovie({
      ...form,
      year: Number(form.year) || new Date().getFullYear(),
      accent: '#85829a',
      symbol: form.title.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase(),
    })

    if (saved) setForm({ title: '', genre: '', year: '', duration: '', director: '', description: '' })
  }

  return <>
    <div className="admin-heading"><div><span className="eyebrow">Catalog</span><h1>Manage movies</h1></div></div>
    <div className="movie-admin-grid">
      <form className="add-movie-form" onSubmit={addMovie}><h3>Add a movie</h3>
        <label>Movie name<input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Enter title" required /></label>
        <div className="field-grid"><label>Genre<input value={form.genre} onChange={(e) => setForm({...form, genre: e.target.value})} placeholder="Drama" /></label><label>Year<input type="number" value={form.year} onChange={(e) => setForm({...form, year: e.target.value})} placeholder="2026" /></label></div>
        <div className="field-grid"><label>Duration<input value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} placeholder="1h 45m" /></label><label>Director<input value={form.director} onChange={(e) => setForm({...form, director: e.target.value})} placeholder="Director name" /></label></div>
        <label>Description<textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Short synopsis" /></label>
        <button className="submit-button" type="submit">Add movie</button>
      </form>
      <div className="movie-list"><h3>Current catalog <span>{movies.length}</span></h3>{movies.map((movie) => <div className="catalog-row" key={movie.id}><div className="mini-poster" style={{background: movie.accent}}>—</div><div><strong>{movie.title}</strong><small>{movie.genre} · {movie.year}</small></div></div>)}</div>
    </div>
  </>
}

export default App
