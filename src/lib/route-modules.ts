import type { AppModule } from "@/lib/permissoes.functions";

/**
 * Mapa rota → módulo. Usado pelo guard de módulo do shell autenticado para
 * fechar o acesso por URL direta a telas que o papel não possui (o menu já
 * esconde, mas esconder não é proteger).
 *
 * Ordem importa: o primeiro prefixo que casar vence, por isso os prefixos
 * mais específicos vêm antes.
 */
const ROUTE_MODULE_PREFIXES: Array<[string, AppModule | AppModule[]]> = [
  ["/dashboard", "dashboard"],
  ["/comercial", "comercial"],
  ["/clientes", "clientes"],
  ["/engenharia", "engenharia"],
  ["/producao", "producao"],
  ["/compras", "compras"],
  ["/fornecedores", "fornecedores"],
  ["/qualidade", "qualidade"],
  ["/pos-vendas", "pos_vendas"],
  ["/logistica", "logistica"],
  ["/know-how", "know_how"],
  ["/changelog", "changelog"],
  ["/design-system", "admin"],
  // Editor de blocos é administrativo de verdade: o menu já esconde, aqui
  // fechamos o acesso por URL.
  ["/central-documentos", "admin"],
  // Templates de Documentos tem abas com dono diferente: Qualidade mantém os
  // templates de FAT, Pós-venda os de SAT (o servidor já valida isso por
  // módulo em cada aba) — não pode exigir só "admin" aqui.
  ["/template-documentos", ["admin", "qualidade", "pos_vendas"]],
  // O importador é usado por quem já tem acesso a Clientes ou Fornecedores
  // (a função de servidor valida o módulo certo por entidade) — não é
  // administrativo, então não pode exigir só "admin" aqui.
  ["/importar", ["clientes", "fornecedores"]],
  ["/admin", "admin"],
];

/**
 * Rotas transversais que todo usuário autenticado pode abrir
 * (conta, ajuda, documentos emitidos e editores de documento).
 */
export function moduleForPath(pathname: string): AppModule | AppModule[] | null {
  for (const [prefix, mod] of ROUTE_MODULE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return mod;
  }
  return null;
}
