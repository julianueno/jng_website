/*
  All site content lives here. Edit this file to add, change or connect work.

  Each entry:
    id       short unique slug, used in the URL (julianueno.xyz/#w/<id>)
    lane     one of the lane ids below
    t        position on the timeline as a decimal year (2024.5 = mid-2024)
    end      optional: draws a bar from t to end (ongoing work)
    title, when, with, text
    img      optional: path to an image in /images (e.g. "images/humviol.jpg"); used as poster for videos
    video    optional: Vimeo, YouTube or Google Drive link. Vimeo/YouTube play as a silent loop
             in the card with a "Play with sound" button; Drive shows a poster and plays on click
             (the Drive file must be shared as "anyone with the link")
    videoStart  optional: seconds into the video where the silent loop / player starts
    loop     optional: path to a short silent .mp4 in /images, autoplays on loop (FA-style)
    fit      optional: 'contain' to show the whole image instead of cropping (banners, posters)
    imgNote  shown in the placeholder until an image is added
    links    [{ label, url }]
    rel      ids of connected entries (connections work both ways automatically)

  Paths are curated routes through the work: an ordered list of entry ids.
*/
window.SITE = {
  start: 2017,
  end: 2027,
  featured: 'humviol',

  lanes: [
    { id: 'projects', label: 'Investigations & projects' },
    { id: 'tools', label: 'Tools & platforms' },
    { id: 'exhib', label: 'Exhibitions & film' },
    { id: 'writing', label: 'Writing & talks' }
  ],

  paths: [
    { id: 'commons', label: 'data commons', ids: ['unionism', 'rts', 'riding', 'engines', 'osmp', 'militant', 'vida', 'chisme'] },
    { id: 'forensic', label: 'forensic', ids: ['medical', 'humviol', 'attacks-aid', 'cartography', 'starvation', 'genocidios'] },
    { id: 'ai-warfare', label: 'AI warfare', ids: ['waiting', 'hidden-casualties', 'taiba', 'shahed', 'thesis', 'humviol', 'patterns', 'recursive', 'target', 'cuadricula', 'genocidios'] },
    { id: 'infrastructure', label: 'infrastructure', ids: ['energy', 'impluvium', 'rts', 'landlord', 'anyplace'] }

  ],

  entries: [
    /* ---------- Investigations & projects ---------- */
    {
      id: 'energy', lane: 'projects', t: 2017.1, end: 2021.3,
      title: 'Energy Infrastructure', when: '2017–2021', with: 'Azimut360 · EarthSpark International',
      text: 'Design, construction and commissioning of decentralised renewable energy systems. In Haiti, the launch of a 100 kW solar microgrid with storage in Les Anglais and the construction of a second in Tiburon (Latin America Green Award 2018). In The Gambia, co-lead on a 500 kWp solar installation for the Medical Research Council, installed entirely by women, and a portable stand-alone unit powering clinical laboratories in The Gambia and Angola. In Spain, 11 PV plants on public buildings and the first collective self-consumption energy communities in the country.',
      img: 'images/energy-poster.jpg',
      loop: 'images/energy-loop.mp4',
      imgNote: 'stand-alone solar container, 3D model',
      links: [
        { label: 'Azimut360', url: 'https://azimut360.coop/en/' },
        { label: 'EarthSpark', url: 'https://www.earthsparkinternational.org/' },
        { label: 'Video, The Gambia', url: 'https://www.youtube.com/watch?v=te9xVNndXnk' }
      ],
      rel: ['impluvium']
    },
    {
      id: 'impluvium', lane: 'projects', t: 2021.5,
      title: 'Impluvium', when: '2021', with: 'with Javier Moreno',
      text: 'Second prize in Barcelona’s SuperBlock design contest. Like an archaeological excavation of Cerdà’s Eixample, the proposal removes the current pavement to give a second opportunity to the old cobblestones, the natural substrate, water and roots.',
      img: 'images/impluvium.jpg',
      links: [{ label: 'Competition entries (PDF)', url: 'https://ajuntament.barcelona.cat/superilles/sites/default/files/projectes_places_lot2.pdf' }],
      rel: ['energy']
    },
    {
      id: 'rts', lane: 'projects', t: 2021.7,
      title: 'Real Time Structure', when: '2021', with: 'Harvard Mellon Urban Initiative · with Xavier Nueno',
      text: 'Departing from Hans Haacke’s Shapolsky et al. Manhattan Real Estate Holdings, a Real-Time Social System, as of May 1, 1971, a mapping of the extent and relations of investment funds in Barcelona’s real-estate property structure.',
      img: 'images/rts.jpg',
      imgNote: 'network of investment funds over Barcelona',
      links: [{ label: 'Project', url: 'https://mellonurbanism.harvard.edu/real-time-property-structure-investment-funds-barcelona' }],
      rel: ['landlord', 'unionism']
    },
    {
      id: 'waiting', lane: 'projects', t: 2022.85,
      title: 'Waiting to Happen', when: '2022', with: 'Airwars & VICE News',
      text: 'Reconstruction of the attack on a US-backed prison in Syria and the failures that made it possible.',
      img: 'images/waiting.jpg',
      imgNote: 'reconstruction of the prison compound',
      links: [
        { label: 'Airwars', url: 'https://airwars.org/investigation/syria-prison-break-isis-us-mistakes/' },
        { label: 'VICE News', url: 'https://www.vice.com/en/feature/v7va98/isis-syria-jailbreak' }
      ],
      rel: ['waiting-doc']
    },
    {
      id: 'hidden-casualties', lane: 'projects', t: 2023.2,
      title: 'The Hidden Casualties of Britain’s War', when: '2023', with: 'Airwars & The Guardian',
      text: 'Searching for the victims of UK strikes in Syria and Iraq. The investigation found civilian deaths linked to British airstrikes in Mosul, despite claims that British weapons had not harmed a single non-combatant.',
      img: 'images/hidden-casualties.jpg',
      imgNote: 'strike locations, Mosul',
      links: [
        { label: 'Airwars', url: 'https://airwars.org/investigation/britain-uk-civilian-casualties-iraq-syria/' },
        { label: 'The Guardian', url: 'https://www.theguardian.com/world/2023/mar/21/multiple-civilian-deaths-linked-to-2016-17-british-airstrikes-against-is-in-mosul' }
      ],
      rel: ['taiba']
    },
    {
      id: 'shahed', lane: 'projects', t: 2023.6,
      title: 'A Year of the Shahed', when: '2023', with: 'Airwars & Der Spiegel',
      text: 'How Iranian drones changed automated warfare in Ukraine. Winner of a Sigma Award for data journalism.',
      img: 'images/shahed.png',
      imgNote: 'drone strike map, Ukraine',
      links: [
        { label: 'Investigation', url: 'https://airwars.org/investigation/shahed-year-russia-ukraine-iran/' },
        { label: 'Sigma Awards', url: 'https://www.sigmaawards.org/meet-the-winners-of-the-sigmas-2024-for-data-journalism/' }
      ],
      rel: ['osmp']
    },
    {
      id: 'medical', lane: 'projects', t: 2023.92,
      title: 'Destruction of Medical Infrastructure in Gaza', when: '2023', with: 'Forensic Architecture',
      text: 'Analysis of the pattern of attacks on Gaza’s medical infrastructure: intimidation, direct targeting, siege and occupation, rendering Gaza’s hospitals out of service.',
      img: 'images/medical.jpg',
      imgNote: 'hospital compound, before / after',
      links: [{ label: 'Platform', url: 'https://gaza-hospitals.forensic-architecture.org/' }],
      rel: ['humviol']
    },
    {
      id: 'humviol', lane: 'projects', t: 2024.15,
      title: 'Humanitarian Violence in Gaza', when: '2024', with: 'Forensic Architecture',
      text: 'Documentation and analysis of Israel’s military campaign turning principles of humanitarianism into weapons deployed against a civilian population in Gaza.',
      img: 'images/humviol.png',
      imgNote: 'evacuation grid blocks over Gaza, animated by date',
      links: [{ label: 'Platform', url: 'https://gaza.forensic-architecture.org/' }],
      rel: ['attacks-aid', 'cartography', 'dai']
    },
    {
      id: 'attacks-aid', lane: 'projects', t: 2024.4,
      title: 'Attacks on Aid in Gaza', when: '2024', with: 'Forensic Architecture',
      text: 'Documentation and analysis of attacks on aid recorded up to May 2024.',
      img: 'images/attacks-aid.jpg',
      imgNote: 'aid convoy routes and strike sites',
      links: [{ label: 'Preliminary findings', url: 'https://forensic-architecture.org/investigation/attacks-on-aid-in-gaza-preliminary-findings' }],
      rel: ['starvation']
    },
    {
      id: 'starvation', lane: 'projects', t: 2025.4,
      title: 'The Architecture of Genocidal Starvation', when: '2025', with: 'Forensic Architecture',
      text: 'Documentation and analysis of Israel’s military destruction of humanitarian aid in Gaza.',
      img: 'images/starvation.jpg',
      links: [{ label: 'Investigation', url: 'https://forensic-architecture.org/investigation/aid-in-gaza' }],
      rel: ['cartography', 'genocidios']
    },

    /* ---------- Tools & platforms ---------- */
    // {
    //   id: 'qgis-housing', lane: 'tools', t: 2021.3,
    //   title: 'QGIS for Housing Union Strategy', when: '2021', with: 'Sindicat de Llogateres',
    //   text: 'Mapping and GIS work in support of the tenants’ union’s organising strategy.',
    //   imgNote: 'GIS map of tenancies',
    //   links: [],
    //   rel: ['sindicat', 'rts']
    // },
    {
      id: 'riding', lane: 'tools', t: 2022.3,
      title: 'Riding the Algorithm', when: '2022', with: 'Centre for Research Architecture & IWGB ·  Ars Electronica Honorary Mention 2026',
      text: 'An app repurposing delivery workers’ data into a digital commons.',
      img: 'images/sabot.png',
      links: [
        { label: 'Code', url: 'https://github.com/julianueno/Sabot' },
        { label: 'Ars Electronica Prize', url: 'https://archive.aec.at/prix/320416/' }
      ],
      rel: ['riding-install']
    },
    {
      id: 'osmp', lane: 'tools', t: 2023.45,
      title: 'Open Source Munitions Portal', when: '2023', with: 'Airwars & ARES',
      text: 'A visual tool for journalists and researchers to classify munition remnants found on the battlefield, with more than 500 verified images.',
      img: 'images/osmp.png',
      links: [{ label: 'Portal', url: 'https://osmp.ngo/' }],
      rel: []
    },
    {
      id: 'cartography', lane: 'tools', t: 2024.9,
      title: 'A Cartography of Genocide', when: '2024', with: 'Forensic Architecture',
      text: 'Documentation and analysis of Israel’s military conduct in Gaza.',
      img: 'images/cartography.jpg',
      imgNote: 'platform screenshot, incidents across the Strip',
      links: [{ label: 'Investigation', url: 'https://forensic-architecture.org/investigation/a-cartography-of-genocide' }],
      rel: ['medical']
    },
    {
      id: 'autopsia', lane: 'tools', t: 2026.4,
      title: 'Autopsia de una huella de datos', when: 'Jun 2026', with: 'Madrid  · Medialab Matadero · with Lucia Rebolino, curated by Bani Brusadi',
      text: 'Taller de metodologías contraforenses y desarrollo de platafroma para mapear el Sistema de Vigiliancia Exterior (SIVE). Este sistema de fortificación de la frontera del estado español está compuesto por una red de sensores, cámaras y radares que sirven para identificar la llegada de embarcaciones a las costas. El taller explora el rol de la imagen y la recolección de datos en la violencia migratoria. Nos preguntamos sobre las proyecciones y las fisuras del SIVE y las mobilizamos para cartografiar su infrastructura y investigar sus lógica',
      img: 'images/autopsia.jpg'
    },

    /* ---------- Exhibitions & film ---------- */
    {
      id: 'sindicat', lane: 'exhib', t: 2021.85,
      title: 'Sindicat', when: '2021', with: 'The Guardian · dir. Irene Baqué',
      text: 'Field producer on a Guardian documentary following organised women defending the right to housing in Spain. Screened at Raindance Film Festival, Curzon Cinema, London.',
      img: 'images/sindicat.jpg',
      imgNote: 'film still',
      links: [{ label: 'Watch', url: 'https://www.theguardian.com/world/ng-interactive/2021/nov/11/sindicat-evading-eviction-barcelona-guardian-documentary' }],
      rel: ['unionism']
    },
    {
      id: 'fora_de_Si', lane: 'exhib', t: 2026.45,
      title: 'Fora de Si', when: 'Jun 2026', with: 'Barcelona · Galeria h3o · with Oriol Arendo  ',
      text: 'La instal·lació sonora al jardí d’H2O fa sensible allò que ha estat fet invisible. Ens connectem a dues antenes veïnals i a la xarxa de radioaficionats del nostre territori. Hi escoltem allò que no estava destinat a l’oïda: retalls de comunicació funcional, torres de control aeri, emissores a l’altra punta del món que reboten contra una atmosfera carregada per la radiació solar i arriben, accidentalment, fins aquí. L’atmosfera es desvela així no tan sols com a mitjà de transmissió, sinó com a cos viu que modela, transforma i és també el missatge.',
      img: 'images/fora_de_si.jpg',
    },
    {
      id: 'riding-install', lane: 'exhib', t: 2022.45,
      title: 'Riding the Algorithm (installation)', when: '2022', with: 'St James Hatcham Gallery, London',
      text: 'MA exhibition. Video installation on the role of data and embodied knowledge in delivery work.',
      img: 'images/riding-install.webp',
      video: 'https://vimeo.com/772977219',
      imgNote: 'installation view',
      links: [{ label: 'Video', url: 'https://vimeo.com/772977219' }],
      rel: []
    },
    {
      id: 'anyplace', lane: 'exhib', t: 2022.6,
      title: 'Qualsevol Lloc / Anyplace', when: '2022', with: 'Arts Santa Mònica · with Noha Mokhtar and Xavier Nueno',
      text: 'Video installation on the work processes that sustain the reproduction of places and objects where mass tourism meets digital economies. Curated by Gema Darbo.',
      img: 'images/anyplace.webp',
      video: 'https://vimeo.com/779206214',
      imgNote: 'video still, Mix Fruit',
      links: [{ label: 'Watch Mix Fruit', url: 'https://vimeo.com/779206214' }],
      rel: []
    },
    {
      id: 'landlord', lane: 'exhib', t: 2022.75,
      title: 'Landlord Open-House', when: '2022', with: 'Model Architecture Festival · with Farzin Lotfi-Jam',
      text: 'Augmented-reality installation exploring the domestic expressions of Barcelona’s real-estate property structure.',
      video: 'https://drive.google.com/file/d/1knfU-ZSCctGYavLqInATjXH8A7oaAk0S/view',
      img: 'images/landlord.jpg',
      loop: 'images/landlord-loop.mp4',
      links: [{ label: 'Video of the AR experience', url: 'https://drive.google.com/file/d/1knfU-ZSCctGYavLqInATjXH8A7oaAk0S/view' }],
      rel: []
    },
    {
      id: 'waiting-doc', lane: 'exhib', t: 2023.05,
      title: 'Waiting to Happen (documentary)', when: '2023', with: 'Airwars & VICE News',
      text: 'Associate producer on the documentary of Airwars and VICE News’ year-long visual investigation into the failures at a US-backed prison in Syria.',
      img: 'images/waiting-doc.jpg',
      imgNote: 'film still',
      links: [{ label: 'Watch', url: 'https://vimeo.com/793836865' }],
      rel: []
    },
    {
      id: 'taiba', lane: 'exhib', t: 2023.3,
      title: 'The Six-Year-Old Victim of Britain’s War in Iraq', when: '2023', with: 'Airwars',
      text: 'Visual investigation into the killing of six-year-old Taiba Younis by a Hellfire missile. Open-Source Film Award.',
      img: 'images/taiba.jpg',
      video: 'https://www.youtube.com/watch?v=-YTaxu0R5og',
      imgNote: 'film still',
      links: [{ label: 'Watch', url: 'https://www.youtube.com/watch?v=-YTaxu0R5og' }],
      rel: []
    },
    {
      id: 'matadero', lane: 'exhib', t: 2024.3,
      title: 'Sin lo otro la tierra no sería', when: '2024', with: 'Matadero Madrid',
      text: 'Research residency between the Centre for Research Architecture and Intermediae at Matadero, convened by María Buey González.',
      img: 'images/matadero.jpg',
      imgNote: 'residency view',
      links: [{ label: 'Programme', url: 'https://www.mataderomadrid.org/programacion/sin-lo-otro-la-tierra-no-seria' }],
      rel: []
    },
    {
      id: 'bivac', lane: 'exhib', t: 2024.55,
      title: 'Festival BIVAC', when: '2024', with: 'CCCB, Barcelona',
      text: 'Participation in BIVAC 2024 at the Centre de Cultura Contemporània de Barcelona.',
      img: 'images/bivac.jpg',
      imgNote: 'festival view',
      links: [{ label: 'CCCB', url: 'https://www.cccb.org/es/actividades/ficha/bivac-2024/246234' }],
      rel: []
    },
    // {
    //   id: 'demonstration', lane: 'exhib', t: 2025.45,
    //   title: 'The Future of Demonstration', when: '2025', with: 'Atelier Augarten, Vienna',
    //   text: 'Hothouse programme.',
    //   imgNote: 'installation view',
    //   links: [{ label: 'Programme', url: 'https://thefutureofdemonstration.net/hothouse/programme.html' }],
    //   rel: ['humviol']
    // },
    {
      id: 'earthworks', lane: 'exhib', t: 2026.5,
      title: 'Earthworks', when: '2026', with: 'Barcelona · World Congress of Architecture · Co-curation with Eyal Weizman and Lizzie Breiner',
      text: 'Earthworks brings together a selection of @forensicarchitecture recent work on Israeli military conduct in Gaza, placing it into dialogue with Eyal Weizman and Rafi Segal’s censored publication, A Civilian Occupation: The Politics of Israeli Architecture, initially conceived for the 2002 World Congress in Berlin. Included works explore the relationship between destruction and construction in Israel’s establishment of military infrastructure for spatial control, with all new work on military earth berm typologies and a video based on Weizman and Segal’s original publication, digitised for the first time for this presentation. Gaza has become not only a demolition zone but a construction site, reshaped according to Israel’s blueprint. Military bulldozers have ripped through the fractured remains of buildings and refashioned the debris into hundreds of towering earth berms—the modular building blocks of a new necro-architecture designed to keep Palestinians under perpetual siege and dismantle the basic conditions of life in Gaza',
      img: 'images/earthworks.jpg',
      imgNote: 'exhibition view, Tres Xemeneies',
      links: [],
      rel: ['cartography']
    },

    /* ---------- Writing & talks ---------- */
    {
      id: 'unionism', lane: 'writing', t: 2021.38,
      title: 'Unionism Today: Short-Circuiting Financial Capital through the Housing Struggle', when: 'May 2021', with: 'Catarsi Magazín',
      text: 'Essay on housing unions and financial capital.',
      img: 'images/unionism.jpg',
      imgNote: 'page spread',
      links: [
        { label: 'Read (Catalan)', url: 'https://catarsimagazin.cat/el-sindicalisme-avui-curtcircuitar-el-capital-financer-des-de-la-lluita-per-lhabitatge/' },
        { label: 'English translation', url: 'https://www.real-time-structure.com/horizons' }
      ],
      rel: ['rts']
    },
    {
      id: 'escapar', lane: 'writing', t: 2021.95,
      title: 'Escapar del bucle', when: 'Dec 2021', with: 'Catarsi Magazín',
      text: 'Essay.',
      img: 'images/escapar.jpg',
      imgNote: 'page spread',
      links: [{ label: 'Read', url: 'https://catarsimagazin.cat/escapar-del-bucle/' }],
      rel: ['engines']
    },
    {
      id: 'engines', lane: 'writing', t: 2023.03,
      title: 'Engines of Inequality', when: 'Jan 2023', with: 'Fabrikzeitung, issue 375 (editor)',
      text: 'Editor of an issue exploring invisible information infrastructures and the digital feedback loops that reproduce inequality.',
      imgNote: 'newspaper cover',
      img: 'images/engines.jpg',
      links: [{ label: 'Issue', url: 'https://www.fabrikzeitung.ch/category/engines-of-inequality/' }],
      rel: []
    },
    {
      id: 'arte-activismo', lane: 'writing', t: 2023.28,
      title: 'Arte y activismo digital', when: 'Apr 2023', with: 'Interview with Victor Balcells',
      text: 'Conversation with the author of Discotecas por fuera (Anagrama, 2022) on digital activism.',
      img: 'images/arte-activismo.jpg',
      video: 'https://www.youtube.com/watch?v=Flq8L8g4PUM',
      imgNote: 'video still',
      links: [{ label: 'Watch', url: 'https://www.youtube.com/watch?v=Flq8L8g4PUM' }],
      rel: []
    },
    {
      id: 'thesis', lane: 'writing', t: 2023.75, end: 2027.0,
      title: 'Individuated Mass Killing', when: '2023–', with: 'PhD, Centre for Research Architecture, Goldsmiths',
      text: 'A spatial method for reconstructing the Israeli military target factory in Gaza. In progress.',
      img: 'images/bombing_campaign.png',
      links: [],
      rel: ['humviol', 'genocidios', 'cartography'],
    },
    {
      id: 'challenging', lane: 'writing', t: 2024.17,
      title: 'Panel at Challenging the Visual', when: 'Mar 2024', with: 'Universitat Pompeu Fabra',
      text: 'Presentation of ongoing work on patterns of attacks in Gaza, truth, documentation and evidence.',
      imgNote: 'conference slide',
      links: [{ label: 'Programme', url: 'https://eventum.upf.edu/108914/programme/challenging-the-visual-distrust-emergency-uncertainty-ii-international-conference-visual-motifs-in-.html' }],
      rel: ['humviol']
    },
    {
      id: 'utopias', lane: 'writing', t: 2024.2,
      title: 'Utopías digitales contra el scroll-down', when: 'Mar 2024', with: 'Ciberlocutorio podcast · with Andrea Gumes and Anna Pacheco',
      text: 'On contesting algorithms and platforms.',
      imgNote: 'podcast cover',
      links: [{ label: 'Listen', url: 'https://open.spotify.com/episode/2xC1ACMo6tpnj81CAHn6nH' }],
      rel: ['chisme']
    },
    {
      id: 'militant', lane: 'writing', t: 2024.27,
      title: 'Digital Autonomía', when: 'Apr 2024', with: 'Militant Media · CRA Books, Spector Books',
      text: 'Book chapter.',
      img: 'images/militant.jpg',
      links: [{ label: 'Book', url: 'https://www.spectorbooks.com/book/militant-media' }],
      rel: ['riding']
    },
    {
      id: 'dai', lane: 'writing', t: 2025.3,
      title: 'Patterns of Destruction. Digital tools to investigate the genocide in Gaza', when: 'Apr 2024', with: 'Princeton Universty · McGill University · ETH Dutch Art Institute  ',
      text: 'Workshops and talks given in different institutions in spring 2024 - autumn 2025, at the invitation of each institution. ',
      imgNote: 'teach-out session',
      rel: ['cartography', 'humviol', 'starvation', 'genocidios']
    },
    // {
    //   id: 'patterns', lane: 'writing', t: 2024.44,
    //   title: 'Patterns beyond AI', when: 'Jun 2024', with: 'Palestine Digital Activism Forum, 7amleh',
    //   text: 'Presentation on open-source methodologies and tools for investigation.',
    //   imgNote: 'presentation slide',
    //   links: [],
    //   rel: []
    // },
    {
      id: 'vida', lane: 'writing', t: 2024.46,
      title: 'La vida corpórea de los datos', when: 'Jun 2024', with: 'Concreta nº 23',
      text: 'Text in “La composición activa de la presencia”.',
      img: 'images/corporea.jpg',

      links: [{ label: 'Issue', url: 'https://www.editorialconcreta.org/-Concreta-23-La-composicion-activa-' }],
      rel: ['riding']
    },
    // {
    //   id: 'recursive', lane: 'writing', t: 2024.7,
    //   title: 'Recursive Violence', when: 'Sep 2024', with: 'Institute for Postnatural Studies',
    //   text: 'Public talk.',
    //   imgNote: 'talk',
    //   links: [],
    //   rel: []
    // },
    {
      id: 'chisme', lane: 'writing', t: 2024.77,
      title: 'El chisme algorítmico', when: 'Oct 2024', with: 'Blog Arquia',
      text: 'Essay.',
      img: 'images/chisme.jpg',
      imgNote: 'page',
      links: [{ label: 'Read', url: 'https://blogfundacion.arquia.es/2024/10/el-chisme-algoritmico/' }],
      rel: []
    },
    {
      id: 'target', lane: 'writing', t: 2024.79,
      title: 'The Target Factory', when: 'Oct 2024', with: 'Verso Books blog',
      text: 'On Israeli military uses of AI to turn civilian sites into military targets.',
      img: 'images/target.jpg',
      imgNote: 'pull quote',
      links: [{ label: 'Read', url: 'https://www.versobooks.com/en-gb/blogs/news/the-target-factory' }],
      rel: ['genocidios']
    },
    {
      id: 'cuadricula', lane: 'writing', t: 2025.77,
      title: 'La cuadrícula de borrado', when: 'Oct 2025', with: 'Archivo Orsini',
      text: 'Essay on the evacuation grid.',
      img: 'images/cuadricula.jpg',
      imgNote: 'grid diagram',
      links: [{ label: 'Read', url: 'https://archivoorsini.com/2025/10/09/la-cuadricula-de-borrado/' }],
      rel: ['genocidios']
    },
    {
      id: 'genocidios', lane: 'writing', t: 2025.8,
      title: 'Genocidios. Una lectura forense', when: 'Oct 2025', with: 'Volume editor · Galaxia Gutenberg',
      text: 'En mayo de 2024, la Fuerza Aérea israelí y la División de Inteligencia recibieron el Premio de Defensa Israelí 2024 por el éxito de su «fábrica de objetivos», que reconocía el uso innovador de «algoritmos avanzados e inteligencia artificial» para identificar blancos humanos. Este libro colectivo incluye un espectro de colaboraciones que analizan esa historia apoyándose en las tecnologías más recientes. Su intención es política: redefinir lo que entendemos por genocidio a la luz de los procesos coloniales y expandir el derecho internacional a partir del caso de Gaza. Para ello reúne voces autorizadas como Rabea Eghbariah, Joshua Abramson, Dima Srouji, Grégoire Chamayou o Marwa Fatatfa. E incluye, además de otros ensayos gráficos, la investigación visual Cartografía de un genocidio, por primera vez en español',
      img: 'images/genocidios_portada.jpg',
      links: [{ label: 'Publisher', url: 'https://www.galaxiagutenberg.com/producto/genocidios/' }],
      rel: ['cartography']
    },
    {
      id: 'frontera_casa', lane: 'writing', t: 2026.38,
      title: 'FRONTERA. Podcast La Casa de la Arquitectura', when: 'Oct 2025', with: 'La Casa de la Arquitectura · Marina Povedano & Natxo Escandell',
      text: 'Podcast. La frontera no es una línea, sino un espacio de fricción, tránsito y espera. Un territorio donde se tensan las normas, se redefinen las identidades y se hacen visibles las desigualdades. La arquitectura ha participado históricamente en su control, pero también en su cuestionamiento. En este bloque pensamos la frontera más allá de lo geográfico: fronteras físicas, digitales, legales y simbólicas; quién puede cruzarlas, quién queda atrapado y qué arquitecturas producen, para entender no solo dónde termina un territorio, sino quién decide —y para quién— el derecho a habitar. ',
      img: 'images/casa_arquitectura.jpg',
      links: [{ label: 'Podcast', url: 'https://lacasadelaarquitectura.es/recurso/la-casa-de-la-casa-frontera/035426a6-1b61-ad25-2fc3-2aa2ebd28524' }],
    },
    {
      id: 'coloquio', lane: 'writing', t: 2026.35,
      title: 'Anarqueología de los Medios', when: 'Sep 2025', with: 'Bogotá · Plano Negativo',
      text: 'Encuentro académico y de investigación para reflexionar sobre las formas de interacción con las tecnologías y las maneras en que estas transforman la sociedad, el conocimiento y los modos de existencia, a partir de los ejes de investigación de arqueología de los medios, diseño, arte y ciencia.',
      img: 'images/coloquio_poster.jpg',
      loop: 'images/coloquio.mp4'
    },
    {
      id: 'degrees', lane: 'writing', t: 2026.39,
      title: '4 degrees of simulation', when: 'Sep 2025', with: 'Institute of Postnatural Studies · Seminar coordinator',
      text: 'This seminar explores sensing as a political and contested practice of knowledge production. Perception is never neutral: infrastructures and techniques determine what is made visible or remains hidden, which claims are amplified or dismissed, whose lives are recognized, and which futures become imaginable. Sensing is thus inseparable from questions of access, recognition, and power.',
      img: 'images/simulation.jpg'
    }
  ]
};
