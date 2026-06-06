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
  'Any Size':        null,
  'Self-Employed':   { min: 1,     max: 1       },
  '1-10':            { min: 1,     max: 10      },
  '11-50':           { min: 11,    max: 50      },
  '51-200':          { min: 51,    max: 200     },
  '201-500':         { min: 201,   max: 500     },
  '501-1,000':       { min: 501,   max: 1000    },
  '1,001-5,000':     { min: 1001,  max: 5000    },
  '5,001-10,000':    { min: 5001,  max: 10000   },
  '10,001+':         { min: 10001, max: 1000000 },
};

const REVENUE_RANGE_MAP = {
  'Any Revenue':  null,
  '<$1M':         { min: 0,         max: 1000000      },
  '$1M-$5M':      { min: 1000000,   max: 5000000      },
  '$5M-$10M':     { min: 5000000,   max: 10000000     },
  '$10M-$25M':    { min: 10000000,  max: 25000000     },
  '$25M-$50M':    { min: 25000000,  max: 50000000     },
  '$50M-$100M':   { min: 50000000,  max: 100000000    },
  '$100M-$250M':  { min: 100000000, max: 250000000    },
  '$250M-$500M':  { min: 250000000, max: 500000000    },
  '$500M+':       { min: 500000000, max: 100000000000 },
};

function mapPDLPerson(person, index) {
  const exp     = person.experience?.[0] || {};
  const company = exp.company || {};
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
  if (person.job_title_levels?.[0]) tags.push(seniorityMap[person.job_title_levels[0]] || person.job_title_levels[0]);
  if (company.industry)             tags.push(company.industry);
  if (person.emails?.[0]?.valid)    tags.push('Verified Email');

  let score = 50;
  if (person.emails?.[0]?.valid)                                               score += 15;
  if (['c_suite','vp','owner','founder'].includes(person.job_title_levels?.[0])) score += 15;
  if (['director','partner'].includes(person.job_title_levels?.[0]))           score += 8;
  if (person.phone_numbers?.length)                                            score += 7;
  if (person.linkedin_url)                                                     score += 3;
  if (company.annual_revenue > 10000000)                                       score += 5;
  score = Math.min(score, 99);

  return {
    id:           person.id || `pdl_${index}`,
    name:         person.full_name || 'Unknown',
    title:        person.job_title || exp.title?.name || '',
    company:      company.name || exp.company?.name || '',
    industry:     company.industry || person.industry || '',
    department:   person.job_title_role || '',
    seniority:    seniorityMap[person.job_title_levels?.[0]] || 'Unknown',
    location:     [person.location_locality, person.location_region, person.location_country].filter(Boolean).join(', '),
    email:        person.emails?.[0]?.address || '',
    phone:        person.phone_numbers?.[0] || '',
    employees,
    revenue,
    score,
    verified:     !!person.emails?.[0]?.valid,
    linkedin:     !!person.linkedin_url,
    tags,
    _pdlId:       person.id,
    _linkedinUrl: person.linkedin_url,
  };
}

export async function searchPeople({ filters = {}, query = '', page = 1, pageSize = 25 } = {}) {
  const conditions = [];

  if (query.trim()) {
    conditions.push(`(full_name LIKE '%${query}%' OR job_title LIKE '%${query}%' OR job_company_name LIKE '%${query}%')`);
  }

  if (filters.industry && filters.industry !== 'All Industries') {
    conditions.push(`job_company_industry = '${filters.industry.toLowerCase()}'`);
  }

  const seniorityValues = SENIORITY_MAP[filters.seniority] || [];
  if (seniorityValues.length) {
    conditions.push(`job_title_levels IN ('${seniorityValues.join("','")}')`);
  }

  const empRange = EMPLOYEE_RANGE_MAP[filters.size];
  if (empRange) {
    conditions.push(`job_company_employee_count >= ${empRange.min} AND job_company_employee_count <= ${empRange.max}`);
  }



