// Ponto de entrada da camada de dados.
//
// Nenhum componente importa `local.ts` ou `supabase.ts` diretamente: a escolha
// do backend acontece aqui, uma vez, e a interface é a mesma dos dois lados.

import type { Repositorio, Backend } from './repositorio';
import { RepositorioLocal } from './local';
import { criarRepositorioSupabase, supabaseConfigurado } from './supabase';

export type { Repositorio, Backend };
export { supabaseConfigurado };

let instancia: Repositorio | null = null;

export function obterRepositorio(): Repositorio {
  if (!instancia) {
    instancia = supabaseConfigurado() ? criarRepositorioSupabase() : new RepositorioLocal();
  }
  return instancia;
}
