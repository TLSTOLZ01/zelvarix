const PDL_PROXY = '/api/pdl-search';

export function searchPeople(options) {
  const filters     = (options && options.filters)     || {};
  const query       = (options && options.query)       || '';
  const pageSize    = (options && options.pageSize)    || 5;
  const scrollToken = (options && options.scrollToken) || null;
  const naicsCodes  = (options && options.naicsCodes)  || [];

  const body = {
    size: pageSize,
    filters: filters,
    query: query,
    naics_codes: naicsCodes,
  };

  if (scrollToken) body.scroll_token = scrollToken;

  return fetch(PDL_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(function(res) {
    if (!res.ok) throw new Error('PDL search failed: ' + res.status);
    return res.json();
  }).then(function(data) {
    var people = data.data || [];
    return {
      contacts: people.map(function(p, i) { return mapPerson(p, i); }),
      total: data.total || people.length,
      scrollToken: data.scroll_token || null,
      hasMore: !!(data.scroll_token),
    };
  });
}

export function enrichPerson(contact) {
  return Promise.resolve(contact);
}

function mapPerson(p, i) {
  var exp = (p.experience && p.experience[0]) || {};
  var co  = exp.company || {};
  var lvl = (p.job_title_levels && p.job_title_levels[0]) || '';
  var em  = (p.emails && p.emails[0]) || {};
  var sm  = {
    owner:'Owner', founder:'Founder', c_suite:'C-Suite',
    partner:'Partner', vp:'VP', director:'Director',
    manager:'Manager', senior:'Senior', entry:'Entry-Level', training:'Intern'
  };
  var score = 50;
  if (em.valid) score += 15;
  if (['c_suite','vp','owner','founder'].indexOf(lvl) > -1) score += 15;
  if (['director','partner'].indexOf(lvl) > -1) score += 8;
  if (p.phone_numbers && p.phone_numbers.length) score += 7;
  if (p.linkedin_url) score += 3;
  if (score > 99) score = 99;
  return {
    id:          p.id || ('pdl_' + i),
    name:        p.full_name || 'Unknown',
    title:       p.job_title || '',
    company:     p.job_company_name || (co.name) || '',
    industry:    p.job_company_industry || co.industry || '',
    department:  p.job_title_role || '',
    seniority:   sm[lvl] || 'Unknown',
    location:    [p.location_locality, p.location_region, p.location_country].filter(Boolean).join(', '),
    email:       em.address || '',
    phone:       (p.phone_numbers && p.phone_numbers[0]) || '',
    employees:   mapEmployees(p.job_company_employee_count),
    revenue:     'Unknown',
    score:       score,
    verified:    !!(em.valid),
    linkedin:    !!(p.linkedin_url),
    tags:        [sm[lvl], p.job_company_industry].filter(Boolean),
    _pdlId:      p.id,
    _linkedinUrl: p.linkedin_url,
  };
}

function mapEmployees(count) {
  if (!count) return 'Unknown';
  if (count <= 1)     return 'Self-Employed';
  if (count <= 10)    return '1-10';
  if (count <= 50)    return '11-50';
  if (count <= 200)   return '51-200';
  if (count <= 500)   return '201-500';
  if (count <= 1000)  return '501-1,000';
  if (count <= 5000)  return '1,001-5,000';
  if (count <= 10000) return '5,001-10,000';
  return '10,001+';
}
