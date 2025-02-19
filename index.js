const express = require('express');
const methodOverride = require('method-override');
const supabase = require('@supabase/supabase-js');
const QRCode = require('qrcode');

const app = express();
const port = 3000;

// Middleware
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Supabase Client
const supabaseClient = supabase.createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
);

function formatText(input) {
  if (!input || typeof input !== 'string') return input;

  // Converti in minuscolo e rimuovi spazi extra
  const cleaned = input.toLowerCase().trim();

  // Capitalizza la prima lettera di ogni parola
  return cleaned.replace(/\b\w/g, char => char.toUpperCase());
}

// Routes
app.get('/', async (req, res) => {
  try {
    let query = supabaseClient
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtro di ricerca migliorato
    if (req.query.q && req.query.q.trim() !== '') {
      const searchTerm = `%${req.query.q.trim().toLowerCase()}%`;
      query = query
        .or(`name.ilike.${searchTerm},category.ilike.${searchTerm}`);
    }

    const { data: items, error } = await query;

    res.render('index', {
      items: items || [],
      error: req.query.error || null,
      searchQuery: req.query.q || ''
    });

  } catch (error) {
    console.error('Search error:', error);
    res.render('index', { items: [], error: 'Errore nella ricerca' });
  }
});

app.post('/add-item', async (req, res) => {
  try {
    const rawData = req.body;

    // Formattazione automatica
    const formattedData = {
      name: formatText(rawData.name),
      category: formatText(rawData.category),
      location: formatText(rawData.location)
    };

    const { error } = await supabaseClient
      .from('items')
      .insert([formattedData]);

    if (error) throw error;
    res.redirect('/');

  } catch (error) {
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

app.put('/items/:id', async (req, res) => {
  try {
    const rawData = req.body;

    // Formattazione automatica
    const formattedData = {
      name: formatText(rawData.name),
      category: formatText(rawData.category),
      location: formatText(rawData.location)
    };

    const { error } = await supabaseClient
      .from('items')
      .update(formattedData)
      .eq('id', req.params.id);

    if (error) throw error;
    res.redirect('/');

  } catch (error) {
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

app.delete('/items/:id', async (req, res) => {
  try {
    const { error } = await supabaseClient
      .from('items')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.redirect('/');

  } catch (error) {
    console.error('Delete error:', error);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});