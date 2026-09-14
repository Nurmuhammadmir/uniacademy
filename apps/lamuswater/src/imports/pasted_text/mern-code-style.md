[09.08.2026 19:58] NUR: # MERN Code-Style / Architecture Prompt Template

Copy-paste this into any AI (Figma AI, v0, Claude, Cursor, etc.) BEFORE describing your actual app idea.
Replace the [PROJECT NAME] and feature list at the bottom with whatever product you're building —
the app can be totally different, but the code logic/structure will match your BOOKA project.

---

## PROMPT START

You are building a MERN stack app called [PROJECT NAME] (MongoDB, Express, React, Node) with Tailwind CSS.
Follow the exact architecture, folder structure, and coding conventions below. This matters more than the
specific feature list — I want the code logic and file organization to be identical in style to a reference
project I already have, even though the product itself is different.

### 1. Repo structure (3 separate apps, 3 separate package.json)
/backend
  /config        -> mongodb.js, cloudinary.js (each exports a single async connect function, default export)
  /controllers   -> one file per resource (e.g. userController.js, adminController.js), all functions
                     defined as const arrow functions, exported together in ONE named export
                     statement at the very bottom of the file: export { fnA, fnB, fnC }
  /middlewares   -> one file per role (authUser.js, authAdmin.js, authDoctor.js) + multer.js
  /models        -> one file per model, mongoose schema, always guarded:
                     const xModel = mongoose.models.x || mongoose.model('x', xSchema)
                     export default xModel
  /routes        -> one file per resource, express.Router(), imports controller fns + middlewares,
                     chains them inline: router.post('/path', authMiddleware, upload.single('image'), controllerFn)
  server.js       -> app config comment header, connectDB(), connectCloudinary(), app.use(express.json()),
                     app.use(cors()), mount routers under /api/<role>, app.listen with console.log

/frontend        -> public-facing site (patients/users/customers)
  /src/assets     -> assets.js barrel file exporting all images/icons as one object
  /src/components -> shared presentational components (Navbar, Footer, Header, etc.)
  /src/context    -> AppContext.jsx: ONE global Context + Provider component holding ALL shared state,
                     ALL API calls (axios), AND the setters — no redux, no separate api/ service layer
  /src/pages      -> one file per route/page
  App.jsx, main.jsx

/admin           -> internal dashboard(s), can contain multiple roles (e.g. Admin + Doctor)
  same shape as frontend but with role-specific context files (AdminContext.jsx, DoctorContext.jsx)
  and role-specific page subfolders: /pages/Admin/*, /pages/Doctor/*

### 2. Backend conventions (non-negotiable)
- Auth: JWT sent as a plain custom header called token (NOT Authorization: Bearer).
  Middleware reads const { token } = req.headers, verifies with jwt.verify(token, process.env.JWT_SECRET),
  attaches decoded id to req.userId (or req.docId, etc.), calls next().
- Passwords: bcrypt, genSalt(10) then hash.
- File uploads: multer diskStorage (keep original filename) -> if a file exists, upload to Cloudinary,
  grab secure_url, then fs.unlinkSync(file.path) to clean up the temp file. Wrap in try/catch and also
  unlink on error.
- Every controller function:
  - is an async (req, res) => { try { ... } catch (error) { console.log(error); res.json({success:false, message:error.message}) } }
  - always responds with `res.json({ success: true/false, ... })` — never res.status(4xx), the frontend
    decides what to do based on the success boolean.
  - has a short lowercase comment above it describing what it does, e.g. // api for adding doctors
- Models: plain mongoose schemas, minimal validation (required: true, sensible default values,
  unique: true on email), no separate validation libraries beyond basic validator package checks
  inside the controller (email format, password length) — not schema-level.
- Routes file per role, mounted in server.js as /api/<role> (e.g. /api/admin, /api/user, /api/doctor).
[09.08.2026 19:58] NUR: ### 3. Frontend/Admin conventions (non-negotiable)
- State management: no Redux/Zustand. One createContext() + Provider component per app
  (AppContext.jsx, and per-role contexts in admin like AdminContext.jsx/DoctorContext.jsx).
  The context holds: state variables, their setters, backendUrl (from import.meta.env.VITE_BACKEND_URL),
  the token (persisted to/read from localStorage), and every axios API call the app needs as a function
  defined inside the provider, exposed through value = {...}.
- API calls: plain axios calls directly inside context functions — const { data } = await axios.get(...)
  — no separate services/api.js layer, no react-query/SWR.
- Feedback: react-toastify — toast.error(data.message) when data.success is false, toast.success(...)
  on success actions (login, save, cancel, etc.).
- Data loading pattern: useEffect on mount to fetch public data (e.g. doctors/products list); a second
  useEffect watching token to load the logged-in user's profile if token exists, else reset that state to false.
- Components: functional components only, const ComponentName = () => {...}; export default ComponentName.
  Props destructured directly in the function signature or via props.x.
- Styling: Tailwind utility classes written directly inline in className, template-literal conditional
  classes for active/selected states (e.g. `` base-classes ${isActive ? 'bg-primary text-white' : ''} ``).
  No CSS modules, no styled-components.
- Routing: react-router-dom — useNavigate, useParams, <Routes>/<Route> in App.jsx.

### 4. Now build this specific product with the SAME structure above:

Product: [describe your actual app idea here — e.g. "a car rental platform" / "a food delivery app" /
whatever it is]

Roles: [list roles — e.g. "customer, vendor, admin"]

Core entities/models: [list your data models — e.g. "User, Product, Order, Vendor"]

Key features per role: [bullet list per role]

Follow every convention in sections 1–3 exactly. Do not introduce Redux, service layers, res.status() codes,
Authorization: Bearer headers, or CSS-in-JS — keep the same "logic fingerprint" as described, just apply it
to this new product.

## PROMPT END