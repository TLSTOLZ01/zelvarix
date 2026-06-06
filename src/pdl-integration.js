ion · JS
const PDL_PROXY = '/api/pdl-search';
 
const SENIORITY_MAP = {
  'Any Seniority': [],
  'Owner':         ['owner'],
  'Founder':       ['founder'],
  'C-Suite':       ['c_suite'],
  'Partner':       ['partner'],
  'VP':            ['vp'],
  'Head':          ['director'],
  'Director':      ['director'],
  'Manager':       ['manager'],
  'Senior':        ['senior'],
  'Entry-Level':   ['entry'],
  'Intern':        ['training'],
};
 
const EMPLOYEE_RANGE_MAP = {
  'Any Size':      null,
  'Self-Employed': { min: 1,     max: 1       },
  '1-10':          { min: 1,     max: 10      },
  '11-50':         { min: 11,    max: 50      },
  '51-200':        { min: 51,    max: 200     },
  '201-500':       { min: 201,   max: 500     },
  '501-1,000':     { min: 501,   max: 1000    },
  '1,001-5,000':   { min: 1001,  max: 5000    },
  '5,001-10,000':  { min: 5001,  max: 10000   },
  '10,001+':       { min: 10001, max: 1000000 },
};
 
const REVENUE_RANGE_MAP = {
  'Any Revenue': null,
  '<$1M':        { min: 0,         max: 1000000      },
  '$1M-$5M':     { min: 1000000,   max: 5000000      },
  '$5M-$10M':    { min: 5000000,   max: 10000000     },
  '$10M-$25M':   { min: 10000000,  max: 25000000     },
  '$25M-$50M':   { min: 25000000,  max: 50000000     },
  '$50M-$100M':  { min: 50000000,  max: 100000000    },
  '$100M-$250M': { min: 100000000, max: 250000000    },
  '$250M-$500M': { min: 250000000, max: 500000000    },
  '$500M+':      { min: 500000000, max: 100000000000 },
};
 
function mapPDLPerson(person, index) {
  const exp      = (person.experience && person.experience[0]) || {};
  const company  = exp.company || {};
  const empCount = company.size || 0;
 
  let employees = 'Unknown';
  if      (empCount <= 1)     employees = 'Self-Employed';
  else if (empCount <= 10)    employees = '1-10';
  else if (empCount <= 50)    employees = '11-50';
  else if (empCount <= 200)   employees = '51-200';
  else if (empCount <= 500)   employees = '201-500';
  else if (empCount <= 1000)  employees = '501-1,000';
  else if (empCount <= 5000)  employees = '1,001-5,000';
  else if (empCount <= 10000) employees = '5,001-10,000';
  else                        employees = '10,001+';
 
  const rev = company.annual_revenue || 0;
  let revenue = 'Unknown';
  if      (rev < 1000000)    revenue = '<$1M';
  else if (rev < 5000000)    revenue = '$1M-$5M';
  else if (rev < 10000000)   revenue = '$5M-$10M';
  else if (rev < 25000000)   revenue = '$10M-$25M';
  else if (rev < 50000000)   revenue = '$25M-$50M';
  else if (rev < 100000000)  revenue = '$50M-$100M';
  else if (rev < 250000000)  revenue = '$100M-$250M';
  else if (rev < 500000000)  revenue = '$250M-$500M';
  else                       revenue = '$500M+';
 
  const seniorityMap = {
    owner: 'Owner', founder: 'Founder', c_suite: 'C-Suite',
    partner: 'Partner', vp: 'VP', director: 'Director',
    manager: 'Manager', senior: 'Senior', entry: 'Entry-Level',
    training: 'Intern',
  };
 
  const tags = [];
  const levels = person.job_title_levels || [];
  if (levels[0]) tags.push(seniorityMap[levels[0]] || levels[0]);
  if (company.industry) tags.push(company.industry);
  const emails = person.emails || [];
  if (emails[0] && emails[0].valid) tags.push('Verified Email');
 
  let score = 50;
  if (emails[0] && emails[0].valid)                              score += 15;
  if (['c_suite','vp','owner','founder'].includes(levels[0]))    score += 15;
  if (['director','partner'].includes(levels[0]))                score += 8;
  if (person.phone_numbers && person.phone_numbers.length)       score += 7;
  if (person.linkedin_url)                                       score += 3;
  if (company.annual_revenue > 10000000)                         score += 5;
  score = Math.min(score, 99);
 
  return {
    id:           person.id || ('pdl_' + index),
    name:         person.full_name || 'Unknown',
    title:        person.job_title || (exp.title && exp.title.name) || '',
    company:      company.name || (exp.company && exp.company.name) || '',
    industry:     company.industry || person.industry || '',
    department:   person.job_title_role || '',
    seniority:    seniorityMap[levels[0]] || 'Unknown',
    location:     [person.location_locality, person.location_region, person.location_country].filter(Boolean).join(', '),
    email:        (emails[0] && emails[0].address) || '',
    phone:        (person.phone_numbers && person.phone_numbers[0]) || '',
    employees:    employees,
    revenue:      revenue,
    score:        score,
    verified:     !!(emails[0] && emails[0].valid),
    linkedin:     !!person.linkedin_url,
    tags:         tags,
    _pdlId:       person.id,
    _linkedinUrl: person.linkedin_url,
  };
}
 
export function searchPeople(options) {
  const filters   = (options && options.filters)   || {};
  const query     = (options && options.query)     || '';
  const page      = (options && options.page)      || 1;
  const pageSize  = (options && options.pageSize)  || 5;
 
  const conditions = [];
 
  if (query.trim()) {
    conditions.push("(full_name LIKE '%" + query.trim() + "%' OR job_title LIKE '%" + query.trim() + "%' OR job_company_name LIKE '%" + query.trim() + "%')");
  }
 
  if (filters.industry && filters.industry !== 'All Industries') {
    conditions.push("job_company_industry = '" + filters.industry.toLowerCase() + "'");
  }
 
  const seniorityValues = SENIORITY_MAP[filters.seniority] || [];
  if (seniorityValues.length) {
    conditions.push("job_title_levels IN ('" + seniorityValues.join("','") + "')");
  }
 
  const empRange = EMPLOYEE_RANGE_MAP[filters.size];
  if (empRange) {
    conditions.push("job_company_employee_count >= " + empRange.min + " AND job_company_employee_count <= " + empRange.max);
  }
 
  const revRange = REVENUE_RANGE_MAP[filters.revenue];
  if (revRange) {
    conditions.push("job_company_inferred_revenue >= " + revRange.min + " AND job_company_inferred_revenue <= " + revRange.max);
  }
 
  if (filters.department && filters.department !== 'Any Department') {
    conditions.push("job_title_role = '" + filters.department.toLowerCase() + "'");
  }
 
  const sqlQuery = conditions.length
    ? 'SELECT * FROM person WHERE ' + conditions.join(' AND ') + ' LIMIT ' + pageSize + ';'
    : 'SELECT * FROM person LIMIT ' + pageSize + ';';
 
  return fetch(PDL_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: sqlQuery, size: pageSize, from: (page - 1) * pageSize }),
  })
  .then(function(res) {
    if (!res.ok) throw new Error('PDL search failed: ' + res.status);
    return res.json();
  })
  .then(function(data) {
    const people = data.data || [];
    return {
      contacts: people.map(mapPDLPerson),
      total:    data.total || people.length,
      page:     page,
      hasMore:  page * pageSize < (data.total || 0),
    };
  });
}
 
export function enrichPerson(contact) {
  const params = new URLSearchParams();
  if (contact._pdlId)       params.append('pdl_id',   contact._pdlId);
  if (contact.name)         params.append('name',     contact.name);
  if (contact.company)      params.append('company',  contact.company);
  if (contact._linkedinUrl) params.append('profile',  contact._linkedinUrl);
 
  return fetch(PDL_PROXY + '/enrich?' + params.toString())
  .then(function(res) {
    if (!res.ok) throw new Error('Enrich failed: ' + res.status);
    return res.json();
  })
  .then(function(data) {
    if (!data.data) return contact;
    const emails = data.data.emails || [];
    const phones = data.data.phone_numbers || [];
    return Object.assign({}, contact, {
      email:    (emails[0] && emails[0].address) || contact.email,
      phone:    phones[0] || contact.phone,
      verified: !!(emails[0] && emails[0].valid),
    });
  })
  .catch(function() { return contact; });
}
