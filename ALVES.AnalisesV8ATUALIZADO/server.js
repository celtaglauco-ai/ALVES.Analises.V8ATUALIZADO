const express = require("express"),
  session = require("express-session"),
  bcrypt = require("bcryptjs"),
  mongoose = require("mongoose"), // Substituído SQLite por Mongoose
  MongoStore = require("connect-mongo"), // Armazenador de sessões na nuvem
  multer = require("multer"),
  path = require("path");

const app = express(),
  PORT = process.env.PORT || 3000,
  ROOT = __dirname;

// Conexão com o MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/alves_v8";
mongoose.connect(MONGO_URI)
  .then(() => console.log("Conectado com sucesso ao MongoDB"))
  .catch(err => console.error("Erro ao conectar ao MongoDB:", err));

// Definição dos Modelos (Esquemas do Banco de Dados)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, default: 'user' },
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date }
});
const User = mongoose.model('User', userSchema);

const leagueSchema = new mongoose.Schema({
  country: { type: String, required: true },
  name: { type: String, required: true },
  csv_name: { type: String },
  csv_data: { type: String },
  games_count: { type: Number, default: 0 },
  updated_at: { type: Date, default: Date.now }
});
leagueSchema.index({ country: 1, name: 1 }, { unique: true });
const League = mongoose.model('League', leagueSchema);

// Carga inicial das ligas e administrador padrão
async function initDatabase() {
  try {
    const leaguesData = [["África do Sul", "Premier Division"], ["Alemanha", "2. Bundesliga"], ["Alemanha", "3. Liga"], ["Alemanha", "Bundesliga"], ["Arábia Saudita", "Saudi Pro League"], ["Argentina", "Liga Profesional"], ["Argentina", "Primera Nacional"], ["Armênia", "Premier League"], ["Austrália", "A-League"], ["Áustria", "Bundesliga"], ["Azerbaijão", "Premier League"], ["Bélgica", "Belgian Pro League"], ["Bolívia", "División Profesional"], ["Brasil", "Brasileirão Série A"], ["Brasil", "Brasileirão Série B"], ["Brasil", "Copa do Brasil"], ["Bulgária", "First League"], ["Canadá", "Canadian Premier League"], ["Catar", "Qatar Stars League"], ["Cazaquistão", "Premier League"], ["Chile", "Primera División"], ["China", "Chinese Super League"], ["Colômbia", "Primera A"], ["Coreia do Sul", "K League 1"], ["Coreia do Sul", "K League 2"], ["Costa Rica", "Primera División"], ["Croácia", "HNL"], ["Dinamarca", "Superliga"], ["Egito", "Premier League"], ["Emirados Árabes Unidos", "UAE Pro League"], ["England", "Premier League"], ["Equador", "LigaPro"], ["Escócia", "Premiership"], ["Eslováquia", "Super Liga"], ["Eslovênia", "PrvaLiga"], ["Espanha", "La Liga"], ["Espanha", "La Liga 2"], ["Estados Unidos", "USL Championship"], ["EUA", "MLS"], ["Finlândia", "Veikkausliiga"], ["França", "Ligue 1"], ["França", "Ligue 2"], ["Geórgia", "Erovnuli Liga"], ["Grécia", "Super League Greece"], ["Guatemala", "Liga Nacional"], ["Holanda", "Eerste Divisie"], ["Holanda", "Eredivisie"], ["Honduras", "Liga Nacional"], ["Hungria", "NB I"], ["Inglaterra", "Championship"], ["Inglaterra", "League One"], ["Inglaterra", "League Two"], ["Inglaterra", "Premier League"], ["Irlanda", "Premier Division"], ["Islândia", "Besta-deild karla"], ["Israel", "Ligat ha'Al"], ["Itália", "Serie A"], ["Itália", "Serie B"], ["Jamaica", "Premier League"], ["Japão", "J1 League"], ["Japão", "J2 League"], ["Marrocos", "Botola Pro"], ["México", "Liga MX"], ["Noruega", "Eliteserien"], ["Paraguai", "Primera División"], ["Peru", "Liga 1"], ["Polônia", "Ekstraklasa"], ["Portugal", "Liga Portugal 2"], ["Portugal", "Primeira Liga"], ["República Tcheca", "Czech First League"], ["Romênia", "Liga I"], ["Rússia", "Premier League"], ["Sérvia", "SuperLiga"], ["Suécia", "Allsvenskan"], ["Suíça", "Super League"], ["Turquia", "Süper Lig"], ["Ucrânia", "Premier League"], ["Uruguai", "Primera División"], ["Uzbequistão", "Super League"]];
    
    for (const [country, name] of leaguesData) {
      await League.updateOne({ country, name }, { $setOnInsert: { country, name } }, { upsert: true });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@alvesanalises.local";
    const adminPass = process.env.ADMIN_PASSWORD || "AlvesAdmin@2026";
    const hasAdmin = await User.findOne({ role: 'admin' });
    
    if (!hasAdmin) {
      await User.create({
        name: "Administrador",
        email: adminEmail,
        password_hash: bcrypt.hashSync(adminPass, 12),
        role: "admin",
        status: "approved"
      });
    }
  } catch (err) {
    console.error("Erro ao inicializar dados:", err);
  }
}
initDatabase();

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true }));

// SESSÃO CONFIGURADA PARA SALVAR NA NUVEM VIA MONGOSTORE
app.use(session({
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  secret: process.env.SESSION_SECRET || "CHANGE-ME-ALVES-V8",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 43200000 // 12 horas
  }
}));

app.use(express.static(path.join(ROOT, "public")));

function auth(req, res, next) {
  if (req.session.user) next();
  else res.status(401).json({ error: "Não autenticado" })
}

function admin(req, res, next) {
  if (req.session.user?.role === "admin") next();
  else res.status(403).json({ error: "Acesso administrativo negado" })
}

app.post("/api/register", async (req, res) => {
  let { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: "Preencha nome, e-mail e senha com pelo menos 6 caracteres." });
  try {
    await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: bcrypt.hashSync(password, 12)
    });
    res.json({ ok: true, message: "Cadastro realizado. Aguarde a aprovação do administrador." })
  } catch (e) {
    res.status(409).json({ error: "Este e-mail já está cadastrado." })
  }
});

app.post("/api/login", async (req, res) => {
  let u = await User.findOne({ email: String(req.body.email || "").trim().toLowerCase() });
  if (!u || !bcrypt.compareSync(String(req.body.password || ""), u.password_hash)) return res.status(401).json({ error: "E-mail ou senha inválidos." });
  if (u.status !== "approved") return res.status(403).json({ error: u.status === "pending" ? "Cadastro aguardando aprovação." : "Acesso bloqueado." });
  
  u.last_login = new Date();
  await u.save();
  
  req.session.user = { id: u._id, name: u.name, email: u.email, role: u.role };
  res.json({ user: req.session.user })
});

app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get("/api/me", (req, res) => res.json({ user: req.session.user || null }));

app.get("/api/leagues", auth, async (req, res) => {
  const list = await League.find({}, 'id country name csv_name games_count updated_at').sort({ country: 1, name: 1 });
  res.json(list);
});

app.get("/api/leagues/:id", auth, async (req, res) => {
  try {
    const l = await League.findById(req.params.id);
    l ? res.json(l) : res.status(404).json({ error: "Liga não encontrada" })
  } catch {
    res.status(400).json({ error: "ID inválido" })
  }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

app.post("/api/leagues/:id/csv", admin, upload.single("file"), async (req, res) => {
  try {
    const l = await League.findById(req.params.id);
    if (!l) return res.status(404).json({ error: "Liga não encontrada" });
    if (!req.file) return res.status(400).json({ error: "Envie um CSV." });
    
    const data = req.file.buffer.toString("utf8"), 
          games = Math.max(0, data.replace(/\r/g, "").split("\n").filter(x => x.trim()).length - 1);
    
    l.csv_name = req.file.originalname;
    l.csv_data = data;
    l.games_count = games;
    l.updated_at = new Date();
    await l.save();
    
    res.json({ ok: true, games_count: games })
  } catch {
    res.status(400).json({ error: "ID inválido" })
  }
});

app.get("/api/users", admin, async (req, res) => {
  const users = await User.find({}, 'id name email role status created_at last_login').sort({ created_at: -1 });
  res.json(users);
});

app.patch("/api/users/:id", admin, async (req, res) => {
  try {
    if (req.params.id === String(req.session.user.id) && req.body.status === "blocked") {
      return res.status(400).json({ error: "Não bloqueie sua própria conta." });
    }
    const update = {};
    if (req.body.status) update.status = req.body.status;
    if (req.body.role) update.role = req.body.role;
    
    await User.findByIdAndUpdate(req.params.id, update);
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: "ID inválido" })
  }
});

app.delete("/api/users/:id", admin, async (req, res) => {
  try {
    if (req.params.id === String(req.session.user.id)) return res.status(400).json({ error: "Não exclua sua própria conta." });
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: "ID inválido" })
  }
});

app.get("/", (req, res) => res.sendFile(path.join(ROOT, "public", "index.html")));

app.listen(PORT, () => console.log("ALVES.AnalisesV8 em http://localhost:" + PORT));
