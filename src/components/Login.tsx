import { useState, type FormEvent } from 'react';
import { useApp } from '../state/store';

/**
 * Entrada por conta — o caminho trancado.
 *
 * Normalmente o app nem chega aqui: quem abre recebe uma sessão anônima e se
 * identifica pela tela de registro inicial. Esta tela assume quando a entrada
 * anônima não é possível (desligada no projeto), e é o caminho para quando o
 * serviço decidir trancar o quadro — aí quem tem acesso é decisão da unidade,
 * não de quem preenche um formulário.
 */
export function Login() {
  const { entrar, erroEntrada } = useApp();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (x) {
      setErro((x as Error).message);
      setEntrando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'var(--color-plum-950)',
      }}
    >
      <form
        onSubmit={enviar}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--surface)',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              flex: '0 0 38px',
              borderRadius: 10,
              background: 'var(--color-gold)',
              color: 'var(--color-plum-950)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            ♥
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>CPN Controle</h1>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 12 }}>
              Centro de Parto Normal
            </p>
          </div>
        </div>

        <div>
          <label className="lbl" htmlFor="login-email">
            E-mail
          </label>
          <div className="field">
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="lbl" htmlFor="login-senha">
            Senha
          </label>
          <div className="field">
            <input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        </div>

        {(erro ?? erroEntrada) && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-late)',
              borderLeftWidth: 4,
              borderRadius: 9,
              background: 'var(--alert-soft)',
              color: 'var(--alert-text)',
              fontSize: 12.5,
            }}
          >
            {erro ?? erroEntrada}
          </div>
        )}

        <button
          type="submit"
          className="btn btn--primary"
          style={{ height: 44 }}
          disabled={entrando || !email.trim() || !senha}
        >
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>

        <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 11.5, lineHeight: 1.55 }}>
          As contas são criadas pela administração da unidade. Se você não tem acesso ou
          esqueceu a senha, procure quem administra o sistema.
        </p>
      </form>
    </div>
  );
}
