export const legalDocuments = {
  terms: {
    title: 'Términos de uso',
    paragraphs: [
      'Joinly permite descubrir y proponer planes locales entre personas adultas. Solo puedes usar el servicio si tienes 18 años o más.',
      'Cada persona creadora es responsable del contenido y condiciones de sus planes. No se permiten suplantaciones, engaños, actividades ilegales ni usos que comprometan la seguridad de la comunidad.',
      'Antes de confirmar una participación solo se muestra una zona aproximada. La ubicación actual se usa únicamente para la búsqueda que inicias y no se guarda como historial.',
    ],
  },
  privacy: {
    title: 'Política de privacidad',
    paragraphs: [
      'Usamos tu correo para autenticar y verificar la cuenta, y tu alias para identificarte dentro de los planes. Tu correo y datos de contacto no son visibles para otras personas.',
      'La ubicación actual solo se solicita después de que elijas buscar con ella. Se utiliza como origen de la consulta y no se conserva como historial.',
      'Puedes solicitar la eliminación de tu cuenta desde la aplicación. El texto completo del borrador v1 está en docs/legal/politica-de-privacidad-v1.md.',
    ],
  },
  guidelines: {
    title: 'Normas de convivencia',
    paragraphs: [
      'Trata a las demás personas con respeto. No se admiten acoso, discriminación, amenazas, violencia ni contenido sexual no consentido.',
      'Publica planes claros y legales, protege los datos de otras personas y respeta las decisiones de acceso y bloqueo.',
      'El incumplimiento puede implicar la retirada de contenido o la limitación de la cuenta.',
    ],
  },
} as const;

export type LegalDocumentId = keyof typeof legalDocuments;
