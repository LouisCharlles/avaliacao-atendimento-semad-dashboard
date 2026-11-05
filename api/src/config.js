import 'dotenv/config';

function obrigatorio(nome) {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${nome}`);
  }
  return valor;
}

const ambiente = process.env.NODE_ENV ?? 'development';

export const config = {
  ambiente,
  porta: Number(process.env.PORT ?? 3000),
  databaseUrl: obrigatorio('DATABASE_URL'),
  jwtSecret: obrigatorio('JWT_SECRET'),
  jwtExpiracao: process.env.JWT_EXPIRES_IN ?? '8h',
  // Em produção atrás de HTTPS, defina COOKIE_SECURE=true.
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // Chave compartilhada que o app do totem envia no cabeçalho X-Totem-Key.
  totemApiKey: obrigatorio('TOTEM_API_KEY'),
  // Origens permitidas para o dashboard em desenvolvimento (separadas por vírgula).
  corsOrigens: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Fuso usado para agrupar avaliações por dia/hora nos relatórios.
  fusoRelatorio: process.env.REPORT_TIMEZONE ?? 'America/Fortaleza',
  bcryptCusto: Number(process.env.BCRYPT_COST ?? 12),
  // Usuários iniciais (criados apenas se ainda não existirem no banco).
  usuariosIniciais: [
    {
      usuario: process.env.ATENDIMENTO_USER ?? 'atendimento',
      nome: process.env.ATENDIMENTO_NAME ?? 'Equipe de Atendimento',
      perfil: 'atendimento',
      senha: process.env.ATENDIMENTO_PASSWORD,
    },
    {
      usuario: process.env.ASSESSORIA_USER ?? 'assessoria',
      nome: process.env.ASSESSORIA_NAME ?? 'Assessoria Técnica',
      perfil: 'assessoria_tecnica',
      senha: process.env.ASSESSORIA_PASSWORD,
    },
  ],
};

if (config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');
}
