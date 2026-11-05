import logoBranco from '../assets/logos/semad-branco-horizontal.png';

export const CONTATO_SEMAD = {
  telefone: '+55 (98) 9136-4561',
  endereco:
    'Complexo Trapiche Santo Ângelo (Armazém João Gualberto da Costa), situado na Avenida Senador Vitorino Freire, s/n, no Centro de São Luís.',
};

export default function Rodape() {
  return (
    <footer className="rodape">
      <div className="rodape__in">
        <img src={logoBranco} alt="Prefeitura de São Luís — SEMAD" />
        <div>
          <h3>Entre em contato com a Central de Atendimento</h3>
          <p>Ligar para: {CONTATO_SEMAD.telefone}</p>
          <p>Endereço: {CONTATO_SEMAD.endereco}</p>
        </div>
      </div>
    </footer>
  );
}
