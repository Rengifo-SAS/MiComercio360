export function SchemaMarkup() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pos.numercia.com';

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MiComercio360',
    alternateName: 'MiComercio360 - Sistema POS',
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    description: 'Sistema completo de punto de venta en la nube para empresas colombianas',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'CO',
      addressRegion: 'Colombia',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Spanish',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MiComercio360',
    url: siteUrl,
    description: 'Sistema completo de punto de venta en la nube para empresas colombianas',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MiComercio360',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'COP',
    },
    description: 'Sistema completo de punto de venta en la nube para empresas colombianas',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        id="organization-schema"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        id="website-schema"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        id="software-schema"
      />
    </>
  );
}
