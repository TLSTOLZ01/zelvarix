const PDL_PROXY = '/api/pdl-search';

export function searchPeople(options) {
  const filters  = (options && options.filters)  || {};
  const query    = (options && options.query)    || '';
  const page     = (options && options.page)     || 1;
  const pageSize = (options && options.pageSize) || 5;
  const conds    = [];

  if (query.trim()) conds.push("full_name LIKE '%" + query.trim() + "%'");
  if (filters.industry && filters.industry !== 'All Industries') conds.push("job_company_industry = '" + filters.industry.toLowerCase() + "'");
  if (filters.size && filters.size !== 'Any Size') {
    const ranges = {'Self-Employed':'1,1','1-10':'1,10','11-50':'11,50','51-200':'51,200','201-500':'201,500','501-1,000':'501,1000','1,001-5,000':'1001,5000','5,001-10,000':'5001,10000','10,001+':'10001,1000000'};
    const r = ranges[filters.size];
    if (r) { const p = r.split(','); conds.push('job_company_employee_count >= ' + p[0] + ' AND job_company_employee_count <= ' + p[1]); }
  }
  if (filters.seniority && filters.seniority !== 'Any Seniority') {
    const sm = {'Owner':'owner','Founder':'founder','C-Suite':'c_suite','Partner':'partner','VP':'vp','Head':'director','Director':'director','Manager':'manager','Senior':'senior','Entry-Level':'entry','Intern':'training'};
    if (sm[filters.seniority]) conds.push("job_title_levels IN ('" + sm[filters.seniority] + "')");
  }
  if (filters.department && filters.department !== 'Any Department') conds.push("job_title_role = '" + filters.department.toLowerCase() + "'");

  const sql = conds.length ? 'SELECT * FROM person WHERE ' + conds.join(' AND ') + ' LIMIT ' + pageSize + ';' : 'SELECT * FROM person LIMIT ' + pageSize + ';';

  return fetch(PDL_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: sql, size: pageSize, from: (page - 1) * pageSize }),
  }).then(function(res) {
    if (!res.ok) throw new Error('PDL search failed: ' + res.status);
    return res.json();
  }).then(function(data) {
    var people = data.data || [];
    return {
      contacts: people.map(function(p, i) { return mapPerson(p, i); }),
      total: data.total || people.length,
      page: page,
      hasMore: page * pageSize < (data.total || 0),
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
  var sm  = {owner:'Owner',founder:'Founder',c_suite:'C-Suite',partner:'Partner',vp:'VP',director:'Director',manager:'Manager',senior:'Senior',entry:'Entry-Level',training:'Intern'};
  var score = 50;
  if (em.valid) score += 15;
  if (['c_suite','vp','owner','founder'].indexOf(lvl) > -1) score += 15;
  if (['director','partner'].indexOf(lvl) > -1) score += 8;
  if (p.phone_numbers && p.phone_numbers.length) score += 7;
  if (p.linkedin_url) score += 3;
  if (score > 99) score = 99;
  return {
    id: p.id || ('pdl_' + i),
    name: p.full_name || 'Unknown',
    title: p.job_title || '',
    company: co.name || '',
    industry: co.industry || p.industry || '',
    department: p.job_title_role || '',
    seniority: sm[lvl] || 'Unknown',
    location: [p.location_locality, p.location_region, p.location_country].filter(Boolean).join(', '),
    email: em.address || '',
    phone: (p.phone_numbers && p.phone_numbers[0]) || '',
    employees: 'Unknown',
    revenue: 'Unknown',
    score: score,
    verified: !!em.valid,
    linkedin: !!p.linkedin_url,
    tags: [sm[lvl], co.industry].filter(Boolean),
    _pdlId: p.id,
    _linkedinUrl: p.linkedin_url,
  };
}
