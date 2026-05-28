const GUIDE_SECTIONS = [
  {
    title: 'Puente de mano',
    icon: '🖐',
    good: 'Base firme, dedos estables y un arco consistente para guiar el taco.',
    bad: 'Puente suelto, muñeca inestable o soporte pobre al inicio del golpe.',
  },
  {
    title: 'Alineación corporal',
    icon: '⬆',
    good: 'Hombros paralelos y cabeza centrada sobre la línea de tiro.',
    bad: 'Torso girado, hombros levantados o cabeza desplazada lateralmente.',
  },
  {
    title: 'Péndulo del codo',
    icon: '💪',
    good: 'Movimiento vertical limpio del antebrazo sin desviar el codo.',
    bad: 'Swing lateral, aceleración brusca o tensión extra al impactar.',
  },
  {
    title: 'Muñeca estable',
    icon: '🤲',
    good: 'Muñeca neutra, sin quiebres abruptos, para mantener precisión.',
    bad: 'Muñeca rota o demasiado activa al ejecutar el golpe.',
  },
  {
    title: 'Balance y base',
    icon: '⚖',
    good: 'Peso distribuido de forma pareja y rodillas suaves para absorber el gesto.',
    bad: 'Poco apoyo, base estrecha o cuerpo desalineado frente a la mesa.',
  },
];

export function TechniqueGuide() {
  return (
    <section className="panel guide-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Guía técnica</span>
          <h2>Principios de postura</h2>
        </div>
      </div>

      <div className="guide-grid">
        {GUIDE_SECTIONS.map((section) => (
          <article key={section.title} className="guide-card">
            <div className="guide-card__title">
              <span>{section.icon}</span>
              <strong>{section.title}</strong>
            </div>
            <p><strong>Correcto:</strong> {section.good}</p>
            <p><strong>Evitar:</strong> {section.bad}</p>
          </article>
        ))}
      </div>
    </section>
  );
}