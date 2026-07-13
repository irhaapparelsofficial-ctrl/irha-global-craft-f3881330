-- Activate the owner-approved, 100%-complete Business Rules set.
-- External writes and commercial commitments remain owner-controlled.

UPDATE public.ai_business_rules
SET version = 2,
    status = 'approved',
    rules = jsonb_build_object(
      'version', 2,
      'status', 'approved',
      'company', jsonb_build_object(
        'legalName', 'Irha Apparels',
        'tradingName', 'Irha Apparels',
        'location', 'Sialkot, Pakistan',
        'businessModel', 'B2B custom apparel manufacturer for wholesale, OEM and private-label buyers',
        'websiteState', 'Experienced manufacturer; website newly built',
        'trustPoints', jsonb_build_array('Factory view available through a scheduled live video call'),
        'priorityMarkets', jsonb_build_array('Germany','Austria','Switzerland','Netherlands','United Kingdom','United States','Canada','Australia','United Arab Emirates','Azerbaijan'),
        'supportedLanguages', jsonb_build_array('English','German','French','Spanish')
      ),
      'commercial', jsonb_build_object(
        'quoteOnly', true,
        'publicPricingAllowed', false,
        'supportedCurrencies', jsonb_build_array('USD','EUR','GBP'),
        'incoterms', jsonb_build_array('FOB','CIF','DDP subject to destination and shipping confirmation'),
        'paymentTerms', jsonb_build_array('Payment terms are confirmed by the owner per quotation; AI cannot commit terms automatically'),
        'moqPolicy', 'Confirm after reviewing product, material, branding, quantity and destination.',
        'samplePolicy', 'Confirm after reviewing buyer requirements and the requested development path.',
        'leadTimePolicy', 'Do not promise a production or delivery date before factory review.',
        'shippingPolicy', 'Confirm shipping method, destination and Incoterm before quotation.',
        'discountPolicy', 'Owner approval required for every discount or commercial concession.'
      ),
      'manufacturing', jsonb_build_object(
        'categories', jsonb_build_array('Bavarian & Trachten Wear','Premium Leather Apparel','Custom Sportswear & Teamwear','Streetwear & Activewear','Leisurewear & Nightwear'),
        'verifiedMaterials', jsonb_build_array('Cotton fabrics','Polyester fabrics','Cotton-polyester blends','Polyester-elastane blends','Leather','Linen','Wool','Velvet'),
        'customizationOptions', jsonb_build_array('Private label','Embroidery','DTF printing','Woven labels','Care labels','Hang tags','Custom packaging'),
        'packagingOptions', jsonb_build_array('Individual polybag','Export carton','Woven labels','Care labels','Hang tags','Custom packaging subject to quotation'),
        'certifications', jsonb_build_array()
      ),
      'authority', jsonb_build_object(
        'safeAcknowledgement','auto',
        'catalogueDelivery','auto',
        'qualificationQuestions','auto',
        'followUpReminder','auto',
        'socialDraft','draft',
        'socialPublish','owner',
        'listingDraft','draft',
        'listingUpdate','owner',
        'seoDraft','draft',
        'finalQuotation','owner',
        'discount','owner',
        'paymentTerms','owner',
        'productionCommitment','owner',
        'complaintSettlement','owner'
      ),
      'prohibitedClaims', jsonb_build_array(
        'Do not invent MOQ, price, production capacity or delivery dates.',
        'Do not claim certifications that are not verified.',
        'Do not claim an email, listing or social post was sent or published without an API result.',
        'Do not expose or repeat API keys, passwords or private buyer files.'
      ),
      'escalationNotes', 'Escalate pricing, discounts, payment terms, production commitments, legal matters, complaints and high-value buyer decisions to the owner.',
      'automation', jsonb_build_object(
        'planOnlyUntilApproved', false,
        'zeroCreditFallbackEnabled', true,
        'externalWritesRequireOwnerApproval', true
      )
    ),
    approved_at = now(),
    updated_at = now()
WHERE id = 'default';
