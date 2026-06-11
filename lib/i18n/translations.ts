// Plain English/Spanish translation dictionaries.
//
// Keys are looked up with dot-paths (e.g. "settings.profile.title") via
// useLanguage().t(). If a key is missing for the active language, English is
// used as a fallback, and if it's missing there too the raw key is returned
// (handy for spotting untranslated strings during development).

const en = {
  common: {
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    loading: "Loading…",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    none: "None",
    notProvided: "Not provided",
  },
  roles: {
    boss: "Boss",
    head: "Manager",
    worker: "Worker",
  },
  jobStatus: {
    pending: "Pending",
    "in-progress": "In Progress",
    completed: "Completed",
    "on-hold": "On Hold",
  },
  language: {
    label: "Language",
    english: "English",
    spanish: "Español",
  },
  nav: {
    dailyJobs: "Daily Jobs",
    schedule: "Schedule",
    workers: "Workers",
    settings: "Settings",
    signOut: "Sign out",
  },
  login: {
    signIn: "Sign in",
    createAccount: "Create account",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    signingIn: "Signing in…",
    creatingAccount: "Creating account…",
    subtitle: "Sign in to continue",
    unauthorized:
      "Your account isn't linked to a team member. Ask your manager to add you, then create your account below.",
  },
  settings: {
    title: "Settings",
    profileTitle: "Profile",
    profileDescription: "Your account information",
    languageTitle: "Language",
    languageDescription: "Choose the language used throughout the app.",
    hiredOn: "Hired {date}",
    hoursValue: "{hours}h this week",
    fields: {
      name: "Name",
      email: "Email",
      phone: "Phone",
      jobTitle: "Job Title",
      role: "Role",
      skills: "Skills",
      status: "Status",
      hireDate: "Hire Date",
      active: "Active",
      inactive: "Inactive",
      notes: "Notes",
      hoursThisWeek: "Hours This Week",
    },
  },
  // EN_NAMESPACES_END
} as const;

const es = {
  common: {
    cancel: "Cancelar",
    save: "Guardar",
    saving: "Guardando…",
    close: "Cerrar",
    edit: "Editar",
    delete: "Eliminar",
    add: "Agregar",
    loading: "Cargando…",
    confirm: "Confirmar",
    yes: "Sí",
    no: "No",
    none: "Ninguno",
    notProvided: "No proporcionado",
  },
  roles: {
    boss: "Jefe",
    head: "Gerente",
    worker: "Trabajador",
  },
  jobStatus: {
    pending: "Pendiente",
    "in-progress": "En Progreso",
    completed: "Completado",
    "on-hold": "En Espera",
  },
  language: {
    label: "Idioma",
    english: "English",
    spanish: "Español",
  },
  nav: {
    dailyJobs: "Trabajos Diarios",
    schedule: "Horario",
    workers: "Trabajadores",
    settings: "Configuración",
    signOut: "Cerrar sesión",
  },
  login: {
    signIn: "Iniciar sesión",
    createAccount: "Crear cuenta",
    email: "Correo electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar contraseña",
    signingIn: "Iniciando sesión…",
    creatingAccount: "Creando cuenta…",
    subtitle: "Inicia sesión para continuar",
    unauthorized:
      "Tu cuenta no está vinculada a ningún miembro del equipo. Pide a tu gerente que te agregue y luego crea tu cuenta a continuación.",
  },
  settings: {
    title: "Configuración",
    profileTitle: "Perfil",
    profileDescription: "La información de tu cuenta",
    languageTitle: "Idioma",
    languageDescription: "Elige el idioma que se usará en toda la aplicación.",
    hiredOn: "Contratado el {date}",
    hoursValue: "{hours}h esta semana",
    fields: {
      name: "Nombre",
      email: "Correo electrónico",
      phone: "Teléfono",
      jobTitle: "Puesto",
      role: "Rol",
      skills: "Habilidades",
      status: "Estado",
      hireDate: "Fecha de contratación",
      active: "Activo",
      inactive: "Inactivo",
      notes: "Notas",
      hoursThisWeek: "Horas esta semana",
    },
  },
  // ES_NAMESPACES_END
} as const;

export type TranslationDict = typeof en;

export const translations = { en, es };
