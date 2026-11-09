// Camada de acesso a dados.
//
// NENHUM componente fala com localStorage ou com o Supabase direto: tudo passa
// por esta interface assíncrona. Na etapa 4 a implementação Supabase assume o
// lugar da local sem que a UI mude.
//
// Sem VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY, o app roda em modo local:
// um quadro por navegador, sem multiusuário. Útil para demonstrar.

import type { EstadoApp } from '../types';
import { estadoInicial } from './seed';

export type Backend = 'local' | 'supabase';

export interface Storage {
  readonly backend: Backend;
  carregar(): Promise<EstadoApp>;
  salvar(estado: EstadoApp): Promise<void>;
  /** Avisa quando outro cliente alterou os dados. Retorna o cancelador. */
  inscrever?(aoMudar: (estado: EstadoApp) => void): () => void;
}

const CHAVE = 'cpn-controle:estado:v1';

class StorageLocal implements Storage {
  readonly backend = 'local' as const;

  async carregar(): Promise<EstadoApp> {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (bruto) return JSON.parse(bruto) as EstadoApp;
    } catch {
      // Dado corrompido no navegador: recomeça do seed em vez de quebrar.
    }
    const inicial = estadoInicial();
    await this.salvar(inicial);
    return inicial;
  }

  async salvar(estado: EstadoApp): Promise<void> {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      // Cota cheia ou modo privado: o app segue em memória nesta sessão.
    }
  }

  inscrever(aoMudar: (estado: EstadoApp) => void): () => void {
    // Outra aba do MESMO navegador. Não é multiusuário — para isso, Supabase.
    const ouvir = (e: StorageEvent) => {
      if (e.key === CHAVE && e.newValue) {
        try {
          aoMudar(JSON.parse(e.newValue) as EstadoApp);
        } catch {
          /* ignora payload inválido */
        }
      }
    };
    window.addEventListener('storage', ouvir);
    return () => window.removeEventListener('storage', ouvir);
  }
}

export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
};

export function supabaseConfigurado(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

let instancia: Storage | null = null;

export function obterStorage(): Storage {
  if (instancia) return instancia;
  // A implementação Supabase entra aqui na etapa 4 (ver supabase/schema.sql
  // e src/services/supabase.ts). Enquanto as variáveis não estiverem
  // preenchidas, o modo local é o correto.
  instancia = new StorageLocal();
  return instancia;
}
