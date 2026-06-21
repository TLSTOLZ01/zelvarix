export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDL_API_KEY not configured' });

  try {
    const body = req.body || {};
    const size = body.size || 5;
    const scroll_token = body.scroll_token || null;
    const filters = body.filters || {};
    const company_keyword = body.companyKeyword || '';
    const query = body.query || '';

    const NAICS_TO_PDL = {
      '111':'farming','112':'farming','1141':'fishing',
      '211':'oil & energy','212':'mining & metals','213':'oil & energy',
      '2211':'utilities','2212':'utilities','2213':'utilities',
      '236':'construction','237':'construction','238':'construction',
      '311':'food & beverages','312':'food & beverages','313':'textiles',
      '315':'apparel & fashion','321':'paper & forest products',
      '322':'paper & forest products','323':'printing',
      '324':'oil & energy','325':'chemicals','3251':'chemicals',
      '3254':'pharmaceuticals','326':'plastics',
      '331':'mining & metals','332':'machinery','333':'machinery',
      '334':'computer hardware','3341':'computer hardware',
      '3344':'semiconductors','335':'electrical/electronic manufacturing',
      '336':'automotive','3361':'automotive',
      '3364':'aviation & aerospace','337':'furniture',
      '423':'wholesale','424':'wholesale','425':'wholesale',
      '441':'automotive','444':'retail','445':'retail',
      '446':'retail','448':'retail','451':'retail',
      '452':'retail','454':'retail','4541':'internet',
      '481':'airlines/aviation','482':'transportation/trucking/railroad',
      '483':'maritime','484':'transportation/trucking/railroad',
      '485':'transportation/trucking/railroad','486':'oil & energy',
      '488':'transportation/trucking/railroad','492':'logistics & supply chain',
      '493':'warehousing','511':'publishing',
      '5112':'computer software','512':'entertainment',
      '515':'broadcast media','516':'online media',
      '517':'telecommunications','5171':'telecommunications',
      '5172':'wireless','518':'information technology and services',
      '5182':'information technology and services',
      '519':'internet','521':'banking','522':'banking',
      '5221':'banking','5222':'financial services',
      '5223':'financial services','523':'investment banking',
      '5231':'capital markets','5239':'investment banking',
      '524':'insurance','5241':'insurance','5242':'insurance',
      '525':'investment management','531':'real estate',
      '5311':'real estate','5312':'real estate',
      '5313':'real estate','532':'financial services',
      '541':'professional training & coaching',
      '5411':'law practice','5412':'accounting',
      '5413':'civil engineering','5414':'design',
      '5415':'information technology and services',
      '5416':'management consulting','5417':'research',
      '5418':'marketing and advertising',
      '5419':'professional training & coaching',
      '551':'management consulting','561':'outsourcing/offshoring',
      '5611':'facilities services','5612':'facilities services',
      '5613':'staffing and recruiting','5614':'outsourcing/offshoring',
      '5615':'leisure, travel & tourism','5616':'security and investigations',
      '5617':'facilities services','562':'environmental services',
      '611':'education management','6111':'primary/secondary education',
      '6112':'higher education','6113':'higher education',
      '6114':'e-learning','6115':'vocational & trades training',
      '6116':'e-learning','6117':'education management',
      '621':'hospital & health care','6211':'medical practice',
      '6212':'medical practice','6213':'medical practice',
      '6214':'hospital & health care','6215':'medical devices',
      '6216':'hospital & health care','6219':'hospital & health care',
      '622':'hospital & health care','6221':'hospital & health care',
      '6222':'mental health care','623':'hospital & health care',
      '624':'individual & family services','6241':'individual & family services',
      '6244':'individual & family services',
      '711':'entertainment','712':'museums and institutions',
      '713':'gambling & casinos','721':'hospitality',
      '7211':'hospitality','722':'restaurants',
      '7221':'restaurants','7222':'restaurants',
      '7224':'wine and spirits','811':'automotive',
      '8111':'automotive','8112':'consumer electronics',
      '8113':'machinery','812':'consumer services',
      '8121':'consumer services','8122':'consumer services',
      '81221':'consumer services','81222':'consumer services',
      '8123':'consumer services','8129':'consumer services',
      '813':'nonprofit organization management',
      '8131':'religious institutions','8132':'philanthropy',
      '8133':'civic & social organization','8134':'civic & social organization',
      '8139':'professional training & coaching',
      '921':'government administration','922':'law enforcement',
      '923':'government administration','924':'environmental services',
      '925':'government administration','926':'government administration',
      '927':'research','928':'defense & space',
      '9281':'defense & space',
      '7372':'computer software',
      '56131':'staffing and recruiting','56132':'staffing and recruiting',
      '54194':'veterinary','56173':'facilities services',
      '4411':'automotive','4412':'automotive',
      '4242':'pharmaceuticals','2131':'oil & energy',
      '2132':'oil & energy','4861':'oil & energy',
      '4862':'oil & energy','33441':'semiconductors',
      '51821':'information technology and services',
      '54171':'biotechnology',
    };

    const naics_codes = body.naics_codes || [];

    const must = [
      { exists: { field: 'job_title' } },
      { exists: { field: 'full_name' } }
    ];

    if (query && query.trim()) {
      must.push({
        bool: {
          should: [
            { match: { full_name: query.trim() } },
            { match: { job_title: query.trim() } },
            { match: { job_company_name: query.trim() } }
          ]
        }
      });
    }

    if (company_keyword && company_keyword.trim()) {
      must.push({ match: { job_company_name: company_keyword.trim().toLowerCase() } });
    } else if (naics_codes && naics_codes.length > 0) {
      const pdlIndustries = [...new Set(naics_codes.map(c => NAICS_TO_PDL[c]).filter(Boolean))];
      if (pdlIndustries.length > 0) {
        must.push({ terms: { job_company_industry: pdlIndustries } });
      }
    } else if (filters.industry && filters.industry !== 'All Industries') {
      must.push({ term: { job_company_industry: filters.industry.toLowerCase() } });
    }

    const seniorityMap = {
      'Owner':'owner','Founder':'founder','C-Suite':'c_suite',
      'Partner':'partner','VP':'vp','Head':'director',
      'Director':'director','Manager':'manager','Senior':'senior',
      'Entry-Level':'entry','Intern':'training'
    };
    if (filters.seniority && filters.seniority !== 'Any Seniority' && seniorityMap[filters.seniority]) {
      must.push({ term: { job_title_levels: seniorityMap[filters.seniority] } });
    }

    if (filters.department && filters.department !== 'Any Department') {
      must.push({ term: { job_title_role: filters.department.toLowerCase() } });
    }

    const sizeMap = {
      'Self-Employed':[1,1],'1-10':[1,10],'11-50':[11,50],
      '51-200':[51,200],'201-500':[201,500],'501-1,000':[501,1000],
      '1,001-5,000':[1001,5000],'5,001-10,000':[5001,10000],'10,001+':[10001,1000000]
    };
    if (filters.size && filters.size !== 'Any Size' && sizeMap[filters.size]) {
      const range = sizeMap[filters.size];
      must.push({ range: { job_company_employee_count: { gte: range[0], lte: range[1] } } });
    }

    if (filters.state && filters.state !== 'Any State') {
      must.push({ term: { location_region: filters.state.toLowerCase() } });
    }

    if (filters.city && filters.city.trim()) {
      must.push({ match: { location_locality: filters.city.trim().toLowerCase() } });
    }

    const payload = {
      query: { bool: { must } },
      size: size,
      pretty: false,
      required: 'job_title AND full_name'
    };

    if (scroll_token) payload.scroll_token = scroll_token;

    const pdlRes = await fetch('https://api.peopledatalabs.com/v5/person/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await pdlRes.json();
    console.log('PDL status:', pdlRes.status, 'results:', (data.data || []).length);
    return res.status(pdlRes.status).json(data);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
