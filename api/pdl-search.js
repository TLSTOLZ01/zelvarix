import React, { useState, useEffect, useCallback, useRef } from "react";
import { searchPeople, enrichPerson } from "./pdl-integration.js";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL || "https://zeuvisaieeswhvddmyje.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_uJdrzhgEpbY8OW-1sgdnvw_EPifiqor";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── APOLLO / AI CONFIG ──────────────────────────────────────────────────────
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

// ── ANALYTICS & MONITORING ───────────────────────────────────────────────────
const GA_MEASUREMENT_ID = 'G-L19SG7QRWX';
const CRISP_WEBSITE_ID  = '2562ef43-438d-4a73-ad32-16d5f901c70a';

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  cream:    "#faf8f4",
  paper:    "#f3f0ea",
  paperd:   "#e8e3d9",
  ink:      "#1a1814",
  inkl:     "#3d3a35",
  inkm:     "#7a7570",
  inkmut:   "#b0aaa2",
  green:    "#1a5c3a",
  greenl:   "#e8f3ec",
  greenm:   "#2d7a52",
  greenb:   "#a8d4b8",
  amber:    "#c47b1a",
  amberl:   "#fdf3e3",
  amberb:   "#f0c87a",
  red:      "#b83232",
  redl:     "#fdeaea",
  redb:     "#e8a0a0",
  border:   "#ddd8cf",
  borderd:  "#ccc5b8",
  shadow:   "rgba(26,24,20,0.08)",
  shadowd:  "rgba(26,24,20,0.14)",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const INDUSTRY_GROUPS = [
  { group: "Aerospace & Defense", options: ["Airlines & Aviation","Aviation & Aerospace","Defense & Space","Military"] },
  { group: "Agriculture", options: ["Farming","Horticulture","Ranching","Tobacco"] },
  { group: "Apparel & Fashion", options: ["Apparel & Fashion","Textiles"] },
  { group: "Automotive", options: ["Automotive"] },
  { group: "Chemicals & Materials", options: ["Chemicals","Plastics"] },
  { group: "Consumer Goods & Retail", options: ["Consumer Goods","Luxury Goods & Jewelry","Retail","Sporting Goods"] },
  { group: "Education & Training", options: ["E-Learning","Education Management","Higher Education","Libraries","Primary/Secondary Education"] },
  { group: "Electronics & Hardware", options: ["Computer Hardware","Consumer Electronics","Electrical & Electronic Manufacturing","Semiconductors"] },
  { group: "Energy & Utilities", options: ["Oil & Energy","Utilities"] },
  { group: "Entertainment", options: ["Animation","Computer Games","Entertainment","Motion Pictures & Film","Music","Performing Arts","Sports"] },
  { group: "Finance & Banking", options: ["Banking","Capital Markets","Financial Services","Investment Banking","Investment Management","Venture Capital & Private Equity"] },
  { group: "Food & Beverage", options: ["Dairy","Food & Beverages","Food Production","Restaurants","Wine and Spirits"] },
  { group: "Government", options: ["Government Administration","Law Enforcement","Public Policy","Public Safety"] },
  { group: "Health & Wellness", options: ["Alternative Medicine","Health, Wellness & Fitness","Hospital & Health Care","Medical Devices","Medical Practice","Mental Health Care"] },
  { group: "Hospitality & Tourism", options: ["Events Services","Hospitality","Leisure, Travel & Tourism"] },
  { group: "Insurance", options: ["Insurance"] },
  { group: "Internet & E-Commerce", options: ["E-Commerce","Internet"] },
  { group: "Manufacturing & Engineering", options: ["Civil Engineering","Industrial Automation","Machinery","Mechanical or Industrial Engineering","Shipbuilding"] },
  { group: "Marketing & Media", options: ["Broadcast Media","Marketing and Advertising","Media Production","Online Media","Publishing"] },
  { group: "Non-Profit", options: ["Nonprofit Organization Management","Philanthropy","Religious Institutions"] },
  { group: "Pharmaceuticals", options: ["Biotechnology","Nanotechnology","Pharmaceuticals"] },
  { group: "Professional Services", options: ["Accounting","Human Resources","Law Practice","Legal Services","Management Consulting","Staffing and Recruiting"] },
  { group: "Real Estate & Construction", options: ["Architecture & Planning","Commercial Real Estate","Construction","Facilities Services","Real Estate"] },
  { group: "Software & IT", options: ["Computer & Network Security","Computer Software","Information Technology and Services","SaaS","Software Development"] },
  { group: "Telecommunications", options: ["Computer Networking","Telecommunications","Wireless"] },
  { group: "Transportation & Logistics", options: ["Logistics & Supply Chain","Package/Freight Delivery","Transportation/Trucking/Railroad","Warehousing"] },
  { group: "Wholesale", options: ["Business Supplies and Equipment","Import and Export","Wholesale"] },
];

// ─── NAICS INDUSTRY DATA ─────────────────────────────────────────────────────
const NAICS_CODES = [
  // Agriculture
  { code:"111", name:"Crop Production" },
  { code:"112", name:"Animal Production and Aquaculture" },
  { code:"1141", name:"Fishing" },
  { code:"115", name:"Support Activities for Agriculture and Forestry" },
  // Mining
  { code:"211", name:"Oil and Gas Extraction" },
  { code:"212", name:"Mining (except Oil and Gas)" },
  { code:"213", name:"Support Activities for Mining" },
  // Utilities
  { code:"2211", name:"Electric Power Generation, Transmission and Distribution" },
  { code:"2212", name:"Natural Gas Distribution" },
  { code:"2213", name:"Water, Sewage and Other Systems" },
  // Construction
  { code:"236", name:"Construction of Buildings" },
  { code:"237", name:"Heavy and Civil Engineering Construction" },
  { code:"238", name:"Specialty Trade Contractors" },
  // Manufacturing
  { code:"311", name:"Food Manufacturing" },
  { code:"312", name:"Beverage and Tobacco Product Manufacturing" },
  { code:"313", name:"Textile Mills" },
  { code:"315", name:"Apparel Manufacturing" },
  { code:"321", name:"Wood Product Manufacturing" },
  { code:"322", name:"Paper Manufacturing" },
  { code:"323", name:"Printing and Related Support Activities" },
  { code:"324", name:"Petroleum and Coal Products Manufacturing" },
  { code:"325", name:"Chemical Manufacturing" },
  { code:"3251", name:"Basic Chemical Manufacturing" },
  { code:"3254", name:"Pharmaceutical and Medicine Manufacturing" },
  { code:"326", name:"Plastics and Rubber Products Manufacturing" },
  { code:"327", name:"Nonmetallic Mineral Product Manufacturing" },
  { code:"331", name:"Primary Metal Manufacturing" },
  { code:"332", name:"Fabricated Metal Product Manufacturing" },
  { code:"333", name:"Machinery Manufacturing" },
  { code:"334", name:"Computer and Electronic Product Manufacturing" },
  { code:"3341", name:"Computer and Peripheral Equipment Manufacturing" },
  { code:"3344", name:"Semiconductor and Other Electronic Component Manufacturing" },
  { code:"335", name:"Electrical Equipment and Appliance Manufacturing" },
  { code:"336", name:"Transportation Equipment Manufacturing" },
  { code:"3361", name:"Motor Vehicle Manufacturing" },
  { code:"3364", name:"Aerospace Product and Parts Manufacturing" },
  { code:"337", name:"Furniture and Related Product Manufacturing" },
  { code:"339", name:"Miscellaneous Manufacturing" },
  // Wholesale Trade
  { code:"423", name:"Merchant Wholesalers, Durable Goods" },
  { code:"424", name:"Merchant Wholesalers, Nondurable Goods" },
  { code:"425", name:"Wholesale Electronic Markets and Agents and Brokers" },
  // Retail Trade
  { code:"441", name:"Motor Vehicle and Parts Dealers" },
  { code:"444", name:"Building Material and Garden Equipment Dealers" },
  { code:"445", name:"Food and Beverage Retailers" },
  { code:"446", name:"Health and Personal Care Stores" },
  { code:"448", name:"Clothing and Clothing Accessories Stores" },
  { code:"451", name:"Sporting Goods, Hobby, Musical Instrument, and Book Stores" },
  { code:"452", name:"General Merchandise Retailers" },
  { code:"454", name:"Nonstore Retailers" },
  { code:"4541", name:"Electronic Shopping and Mail-Order Houses" },
  // Transportation
  { code:"481", name:"Air Transportation" },
  { code:"482", name:"Rail Transportation" },
  { code:"483", name:"Water Transportation" },
  { code:"484", name:"Truck Transportation" },
  { code:"485", name:"Transit and Ground Passenger Transportation" },
  { code:"486", name:"Pipeline Transportation" },
  { code:"488", name:"Support Activities for Transportation" },
  { code:"492", name:"Couriers and Messengers" },
  { code:"493", name:"Warehousing and Storage" },
  // Information
  { code:"511", name:"Publishing Industries" },
  { code:"5112", name:"Software Publishers" },
  { code:"512", name:"Motion Picture and Sound Recording Industries" },
  { code:"515", name:"Broadcasting (except Internet)" },
  { code:"516", name:"Internet Publishing and Broadcasting" },
  { code:"517", name:"Telecommunications" },
  { code:"5171", name:"Wired Telecommunications Carriers" },
  { code:"5172", name:"Wireless Telecommunications Carriers" },
  { code:"518", name:"Computing Infrastructure Providers, Data Processing" },
  { code:"5182", name:"Data Processing, Hosting, and Related Services" },
  { code:"519", name:"Web Search Portals, Libraries, Archives" },
  // Finance and Insurance
  { code:"521", name:"Monetary Authorities — Central Bank" },
  { code:"522", name:"Credit Intermediation and Related Activities" },
  { code:"5221", name:"Depository Credit Intermediation (Banking)" },
  { code:"5222", name:"Nondepository Credit Intermediation" },
  { code:"5223", name:"Activities Related to Credit Intermediation" },
  { code:"523", name:"Securities, Commodity Contracts, Financial Investments" },
  { code:"5231", name:"Securities and Commodity Exchanges" },
  { code:"5239", name:"Investment Banking and Securities Dealing" },
  { code:"524", name:"Insurance Carriers and Related Activities" },
  { code:"5241", name:"Insurance Carriers" },
  { code:"5242", name:"Agencies, Brokerages, and Other Insurance" },
  { code:"525", name:"Funds, Trusts, and Other Financial Vehicles" },
  // Real Estate
  { code:"531", name:"Real Estate" },
  { code:"5311", name:"Lessors of Real Estate" },
  { code:"5312", name:"Offices of Real Estate Agents and Brokers" },
  { code:"5313", name:"Activities Related to Real Estate" },
  { code:"532", name:"Rental and Leasing Services" },
  // Professional Services
  { code:"541", name:"Professional, Scientific, and Technical Services" },
  { code:"5411", name:"Legal Services" },
  { code:"5412", name:"Accounting, Tax Preparation, Bookkeeping" },
  { code:"5413", name:"Architectural, Engineering, and Related Services" },
  { code:"5414", name:"Specialized Design Services" },
  { code:"5415", name:"Computer Systems Design and Related Services" },
  { code:"5416", name:"Management, Scientific, and Technical Consulting" },
  { code:"5417", name:"Scientific Research and Development Services" },
  { code:"5418", name:"Advertising, Public Relations, and Related Services" },
  { code:"5419", name:"Other Professional, Scientific, and Technical Services" },
  // Management
  { code:"551", name:"Management of Companies and Enterprises" },
  // Administrative Services
  { code:"561", name:"Administrative and Support Services" },
  { code:"5611", name:"Office Administrative Services" },
  { code:"5612", name:"Facilities Support Services" },
  { code:"5613", name:"Employment Services" },
  { code:"5614", name:"Business Support Services" },
  { code:"5615", name:"Travel Arrangement and Reservation Services" },
  { code:"5616", name:"Investigation and Security Services" },
  { code:"5617", name:"Services to Buildings and Dwellings" },
  { code:"562", name:"Waste Management and Remediation Services" },
  // Education
  { code:"611", name:"Educational Services" },
  { code:"6111", name:"Elementary and Secondary Schools" },
  { code:"6112", name:"Junior Colleges" },
  { code:"6113", name:"Colleges, Universities, and Professional Schools" },
  { code:"6114", name:"Business Schools and Computer and Management Training" },
  { code:"6115", name:"Technical and Trade Schools" },
  { code:"6116", name:"Other Schools and Instruction" },
  { code:"6117", name:"Educational Support Services" },
  // Health Care
  { code:"621", name:"Ambulatory Health Care Services" },
  { code:"6211", name:"Offices of Physicians" },
  { code:"6212", name:"Offices of Dentists" },
  { code:"6213", name:"Offices of Other Health Practitioners" },
  { code:"6214", name:"Outpatient Care Centers" },
  { code:"6215", name:"Medical and Diagnostic Laboratories" },
  { code:"6216", name:"Home Health Care Services" },
  { code:"6219", name:"Other Ambulatory Health Care Services" },
  { code:"622", name:"Hospitals" },
  { code:"6221", name:"General Medical and Surgical Hospitals" },
  { code:"6222", name:"Psychiatric and Substance Abuse Hospitals" },
  { code:"623", name:"Nursing and Residential Care Facilities" },
  { code:"624", name:"Social Assistance" },
  { code:"6241", name:"Individual and Family Services" },
  { code:"6244", name:"Child Day Care Services" },
  // Arts and Entertainment
  { code:"711", name:"Performing Arts, Spectator Sports, and Related" },
  { code:"712", name:"Museums, Historical Sites, and Similar Institutions" },
  { code:"713", name:"Amusement, Gambling, and Recreation Industries" },
  // Accommodation and Food
  { code:"721", name:"Accommodation" },
  { code:"7211", name:"Traveler Accommodation (Hotels)" },
  { code:"722", name:"Food Services and Drinking Places" },
  { code:"7221", name:"Full-Service Restaurants" },
  { code:"7222", name:"Limited-Service Eating Places" },
  { code:"7224", name:"Drinking Places (Alcoholic Beverages)" },
  // Other Services
  { code:"811", name:"Repair and Maintenance" },
  { code:"8111", name:"Automotive Repair and Maintenance" },
  { code:"8112", name:"Electronic and Precision Equipment Repair" },
  { code:"8113", name:"Commercial and Industrial Machinery Repair" },
  { code:"812", name:"Personal and Laundry Services" },
  { code:"8121", name:"Personal Care Services (Salons, Spas)" },
  { code:"8122", name:"Death Care Services" },
  { code:"81221", name:"Funeral Homes and Funeral Services" },
  { code:"81222", name:"Cemeteries and Crematories" },
  { code:"8123", name:"Drycleaning and Laundry Services" },
  { code:"8129", name:"Other Personal Services" },
  { code:"813", name:"Religious, Grantmaking, Civic, and Professional Organizations" },
  { code:"8131", name:"Religious Organizations" },
  { code:"8132", name:"Grantmaking and Giving Services" },
  { code:"8133", name:"Social Advocacy Organizations" },
  { code:"8134", name:"Civic and Social Organizations" },
  { code:"8139", name:"Business, Professional, Labor Organizations" },
  // Public Administration
  { code:"921", name:"Executive, Legislative, and General Government" },
  { code:"922", name:"Justice, Public Order, and Safety Activities" },
  { code:"923", name:"Administration of Human Resource Programs" },
  { code:"924", name:"Administration of Environmental Quality Programs" },
  { code:"925", name:"Administration of Housing Programs, Urban Planning" },
  { code:"926", name:"Administration of Economic Programs" },
  { code:"927", name:"Space Research and Technology" },
  { code:"928", name:"National Security and International Affairs" },
  // Defense & Aerospace (common B2B)
  { code:"3364", name:"Aerospace Product and Parts Manufacturing" },
  { code:"9281", name:"National Security" },
  // Tech specifics
  { code:"5415", name:"Computer Systems Design and Related Services" },
  { code:"5112", name:"Software Publishers" },
  { code:"7372", name:"Prepackaged Software (SaaS)" },
  { code:"5182", name:"Cloud Computing and Data Centers" },
  // Staffing
  { code:"5613", name:"Employment Services / Staffing" },
  { code:"56131", name:"Temporary Help Services" },
  { code:"56132", name:"Professional Employer Organizations" },
  // Veterinary
  { code:"54194", name:"Veterinary Services" },
  // Landscaping
  { code:"56173", name:"Landscaping Services" },
  // Auto dealers
  { code:"4411", name:"Automobile Dealers" },
  { code:"4412", name:"Other Motor Vehicle Dealers" },
  // Pharma distribution
  { code:"4242", name:"Drugs and Druggists Sundries Merchant Wholesalers" },
  // Oil field services
  { code:"2131", name:"Drilling Oil and Gas Wells" },
  { code:"2132", name:"Support Activities for Oil and Gas Operations" },
  // LNG / Pipelines
  { code:"4861", name:"Pipeline Transportation of Crude Oil" },
  { code:"4862", name:"Pipeline Transportation of Natural Gas" },
  // Semiconductor fab
  { code:"33441", name:"Semiconductor and Related Device Manufacturing" },
  // Data centers
  { code:"51821", name:"Data Processing and Hosting Services" },
  // Biotech
  { code:"54171", name:"Research and Development in Life Sciences" },
];

// ─── NAICS SEARCH COMPONENT ──────────────────────────────────────────────────
function NaicsIndustrySearch({ value, onChange }) {
  // Fully controlled — driven by value prop, no internal selected state
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const matches = query.length < 2 ? [] : NAICS_CODES.filter(n =>
    n.name.toLowerCase().includes(query.toLowerCase()) ||
    n.code.startsWith(query)
  ).slice(0, 8);

  function select(item) {
    setQuery("");
    setOpen(false);
    onChange(item);
  }

  function clear() {
    setQuery("");
    onChange(null);
  }

  return (
    <div ref={ref} style={{ position:"relative" }}>
      {value ? (
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 8px", background:T.greenl, border:`1px solid ${T.greenb}`, borderRadius:4 }}>
          <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:T.green, fontWeight:600 }}>{value.code}</span>
          <span style={{ fontSize:11, color:T.inkl, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value.name}</span>
          <button onClick={clear} style={{ background:"none", border:"none", color:T.inkm, cursor:"pointer", fontSize:14, lineHeight:1, padding:0, flexShrink:0 }}>×</button>
        </div>
      ) : (
        <input
          className="input-base"
          value={query}
          onChange={e=>{ setQuery(e.target.value); setOpen(true); }}
          onFocus={()=>setOpen(true)}
          placeholder="Search industry…"
          style={{ fontSize:12, padding:"7px 10px" }}
        />
      )}
      {open && matches.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 2px)", left:0, right:0, background:"#fff", border:`1px solid ${T.border}`, borderRadius:4, boxShadow:`0 4px 16px ${T.shadowd}`, zIndex:200, maxHeight:220, overflowY:"auto" }}>
          {matches.map(item => (
            <button key={item.code} onClick={()=>select(item)} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"none", border:"none", borderBottom:`1px solid ${T.border}`, cursor:"pointer", textAlign:"left", fontFamily:"'DM Sans',sans-serif" }}>
              <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:T.green, fontWeight:600, flexShrink:0, minWidth:36 }}>{item.code}</span>
              <span style={{ fontSize:12, color:T.inkl, lineHeight:1.3 }}>{item.name}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.length >= 2 && matches.length === 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 2px)", left:0, right:0, background:"#fff", border:`1px solid ${T.border}`, borderRadius:4, padding:"10px", fontSize:12, color:T.inkmut, zIndex:200 }}>
          No industries found for "{query}"
        </div>
      )}
    </div>
  );
}


const COMPANY_SIZES = ["Any Size","Self-Employed","1-10","11-50","51-200","201-500","501-1,000","1,001-5,000","5,001-10,000","10,001+"];
const SENIORITY    = ["Any Seniority","Owner","Founder","C-Suite","Partner","VP","Head","Director","Manager","Senior","Entry-Level","Intern"];
const DEPARTMENTS  = ["Any Department","Accounting","Administrative","Business Development","Consulting","Engineering","Finance","Healthcare Services","Human Resources","Information Technology","Legal","Marketing","Operations","Product Management","Purchasing","Research","Sales","Support"];
const REVENUES     = ["Any Revenue","<$1M","$1M-$5M","$5M-$10M","$10M-$25M","$25M-$50M","$50M-$100M","$100M-$250M","$250M-$500M","$500M+"];

const US_STATES = [
  "Any State",
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

const ROLE_PERMISSIONS = {
  admin:   { canExport:true,  canInvite:true,  canManageLists:true,  canViewTeam:true,  canManageBilling:true,  canSearch:true, label:"Admin",    color:T.green,  bg:T.greenl,  border:T.greenb },
  manager: { canExport:true,  canInvite:true,  canManageLists:true,  canViewTeam:true,  canManageBilling:false, canSearch:true, label:"Manager",  color:T.amber,  bg:T.amberl,  border:T.amberb },
  rep:     { canExport:true,  canInvite:false, canManageLists:true,  canViewTeam:false, canManageBilling:false, canSearch:true, label:"Sales Rep", color:T.inkl,   bg:T.paper,   border:T.borderd },
  viewer:  { canExport:false, canInvite:false, canManageLists:false, canViewTeam:false, canManageBilling:false, canSearch:true, label:"Viewer",   color:T.inkm,   bg:T.cream,   border:T.border },
};

const MOCK_CONTACTS = [
  { id:1,  name:"Sarah Chen",          title:"VP of Sales",                department:"Sales",      seniority:"VP",       company:"Nexora Technologies",       industry:"SaaS",                               location:"San Francisco, CA", email:"s.chen@nexora.io",             phone:"+1 (415) 882-3310", employees:"501-1,000",    revenue:"$50M-$100M",  score:94, verified:true,  tags:["Decision Maker","Active Buyer"] },
  { id:2,  name:"Marcus Webb",          title:"Chief Revenue Officer",       department:"Sales",      seniority:"C-Suite",  company:"Pulsar Analytics",           industry:"Information Technology and Services", location:"Austin, TX",         email:"m.webb@pulsaranalytics.com",   phone:"+1 (512) 447-9921", employees:"201-500",      revenue:"$10M-$50M",   score:88, verified:true,  tags:["C-Suite","High Intent"] },
  { id:3,  name:"Priya Nair",           title:"Director of Marketing",       department:"Marketing",  seniority:"Director", company:"CloudVault Inc",              industry:"Computer Software",                  location:"New York, NY",       email:"p.nair@cloudvault.com",         phone:"+1 (646) 334-7782", employees:"1,001-5,000",  revenue:"$100M+",      score:81, verified:true,  tags:["Marketing Leader"] },
  { id:4,  name:"Derek Liu",            title:"CEO & Co-Founder",            department:"Operations", seniority:"Founder",  company:"Stackr.io",                  industry:"Software Development",               location:"Seattle, WA",        email:"derek@stackr.io",               phone:"+1 (206) 771-3390", employees:"11-50",        revenue:"<$5M",        score:71, verified:true,  tags:["Founder","Early Stage"] },
  { id:5,  name:"Tanya Okoye",          title:"Head of Cybersecurity",       department:"IT",         seniority:"Head",     company:"ShieldNet Systems",           industry:"Computer & Network Security",         location:"Washington, DC",     email:"t.okoye@shieldnet.com",         phone:"+1 (202) 556-8821", employees:"201-500",      revenue:"$10M-$50M",   score:85, verified:true,  tags:["Security","Decision Maker"] },
  { id:6,  name:"James Thornton",       title:"Managing Director",           department:"Finance",    seniority:"Director", company:"Crestline Capital",           industry:"Investment Banking",                 location:"Chicago, IL",        email:"j.thornton@crestline.com",      phone:"+1 (312) 553-0044", employees:"51-200",       revenue:"$50M-$100M",  score:76, verified:false, tags:["Finance","High Value"] },
  { id:7,  name:"Patricia Hollis",      title:"SVP Retail Banking",          department:"Finance",    seniority:"VP",       company:"Meridian Bank",               industry:"Banking",                            location:"Charlotte, NC",      email:"p.hollis@meridianbank.com",     phone:"+1 (704) 332-9900", employees:"5,001-10,000", revenue:"$500M+",      score:83, verified:true,  tags:["Enterprise","Decision Maker"] },
  { id:8,  name:"Ronald Kwame",         title:"Portfolio Manager",           department:"Finance",    seniority:"Manager",  company:"Apex Investment Group",       industry:"Investment Management",               location:"New York, NY",       email:"r.kwame@apexig.com",            phone:"+1 (212) 774-5510", employees:"51-200",       revenue:"$50M-$100M",  score:79, verified:true,  tags:["Wealth Mgmt","Active Buyer"] },
  { id:9,  name:"Denise Fuentes",       title:"CFO",                         department:"Finance",    seniority:"C-Suite",  company:"BlueStar Financial",          industry:"Financial Services",                 location:"Dallas, TX",         email:"d.fuentes@bluestarfin.com",     phone:"+1 (214) 889-4411", employees:"201-500",      revenue:"$50M-$100M",  score:91, verified:true,  tags:["C-Suite","Decision Maker"] },
  { id:10, name:"Leila Farouk",         title:"SVP Enterprise Sales",        department:"Sales",      seniority:"VP",       company:"Meridian Health Systems",     industry:"Hospital & Health Care",              location:"Boston, MA",         email:"l.farouk@meridianhealth.com",   phone:"+1 (617) 229-8801", employees:"5,001-10,000", revenue:"$500M+",      score:92, verified:true,  tags:["Enterprise","Decision Maker"] },
  { id:11, name:"Victor Patel",         title:"Chief Medical Officer",       department:"Healthcare", seniority:"C-Suite",  company:"Novara Health",               industry:"Medical Practice",                   location:"Houston, TX",        email:"v.patel@novarahealth.com",      phone:"+1 (713) 445-2200", employees:"1,001-5,000",  revenue:"$100M+",      score:89, verified:true,  tags:["C-Suite","Clinical Leader"] },
  { id:12, name:"Amber Johansson",      title:"Director of Operations",      department:"Operations", seniority:"Director", company:"ClearPath Medical",           industry:"Medical Devices",                    location:"Minneapolis, MN",    email:"a.johansson@clearpath.com",     phone:"+1 (612) 338-7700", employees:"201-500",      revenue:"$10M-$50M",   score:77, verified:true,  tags:["Operations","MedTech"] },
  { id:13, name:"Thomas Gruber",        title:"VP of Operations",            department:"Operations", seniority:"VP",       company:"Ironcast Manufacturing",      industry:"Machinery",                          location:"Detroit, MI",        email:"t.gruber@ironcast.com",         phone:"+1 (313) 567-4400", employees:"1,001-5,000",  revenue:"$100M+",      score:82, verified:true,  tags:["Manufacturing","Decision Maker"] },
  { id:14, name:"Sandra Reeves",        title:"Director of Engineering",     department:"Engineering",seniority:"Director", company:"Apex Precision Parts",        industry:"Mechanical or Industrial Engineering", location:"Cleveland, OH",      email:"s.reeves@apexprecision.com",    phone:"+1 (216) 443-8800", employees:"201-500",      revenue:"$10M-$50M",   score:78, verified:true,  tags:["Engineering","High Intent"] },
  { id:15, name:"Carlos Mendez",        title:"CEO",                         department:"Operations", seniority:"C-Suite",  company:"Skyline Development Group",   industry:"Commercial Real Estate",              location:"Miami, FL",          email:"c.mendez@skylinedev.com",       phone:"+1 (305) 774-8800", employees:"51-200",       revenue:"$50M-$100M",  score:88, verified:true,  tags:["CRE","Decision Maker"] },
  { id:16, name:"Beth Larsson",         title:"VP of Acquisitions",          department:"Real Estate",seniority:"VP",       company:"Pinnacle Real Estate",        industry:"Real Estate",                        location:"Phoenix, AZ",        email:"b.larsson@pinnaclere.com",      phone:"+1 (602) 445-3300", employees:"201-500",      revenue:"$100M+",      score:81, verified:true,  tags:["Acquisitions","High Value"] },
  { id:17, name:"Diana Osei",           title:"VP of Business Development",  department:"BD",         seniority:"VP",       company:"SolarEdge Energy Co",         industry:"Oil & Energy",                       location:"Austin, TX",         email:"d.osei@solaredge.co",           phone:"+1 (512) 334-2200", employees:"201-500",      revenue:"$10M-$50M",   score:87, verified:true,  tags:["Clean Energy","High Intent"] },
  { id:18, name:"Jessica Park",         title:"Chief Marketing Officer",     department:"Marketing",  seniority:"C-Suite",  company:"Luminary Brands",             industry:"Consumer Goods",                     location:"Los Angeles, CA",    email:"j.park@luminarybrands.com",     phone:"+1 (310) 882-7700", employees:"501-1,000",    revenue:"$100M+",      score:90, verified:true,  tags:["CMO","CPG","Decision Maker"] },
  { id:19, name:"Aaron Blake",          title:"VP of Merchandising",         department:"Operations", seniority:"VP",       company:"Harbor Retail Group",         industry:"Retail",                             location:"Seattle, WA",        email:"a.blake@harborretail.com",      phone:"+1 (206) 443-5500", employees:"1,001-5,000",  revenue:"$100M+",      score:77, verified:true,  tags:["Retail","Merchandising"] },
  { id:20, name:"Roberto Escobar",      title:"VP of Sales",                 department:"Sales",      seniority:"VP",       company:"Mesa Food Group",             industry:"Food & Beverages",                   location:"Chicago, IL",        email:"r.escobar@mesafood.com",        phone:"+1 (312) 774-6600", employees:"201-500",      revenue:"$50M-$100M",  score:79, verified:true,  tags:["Food Bev","Distributor"] },
  { id:21, name:"Angela Torres",        title:"VP of Partnerships",          department:"BD",         seniority:"VP",       company:"EduPath Inc",                 industry:"E-Learning",                         location:"Boston, MA",         email:"a.torres@edupathlearn.com",     phone:"+1 (617) 663-2200", employees:"51-200",       revenue:"$10M-$50M",   score:76, verified:true,  tags:["EdTech","Partnerships"] },
  { id:22, name:"Fiona Adeyemi",        title:"Director of Enterprise Sales",department:"Sales",      seniority:"Director", company:"NetCore Telecom",             industry:"Telecommunications",                 location:"Dallas, TX",         email:"f.adeyemi@netcoretel.com",      phone:"+1 (214) 663-7700", employees:"1,001-5,000",  revenue:"$100M+",      score:84, verified:true,  tags:["Telecom","Enterprise"] },
  { id:23, name:"Harold Simmons",       title:"SVP Supply Chain",            department:"Operations", seniority:"VP",       company:"FastRoute Logistics",         industry:"Logistics & Supply Chain",            location:"Memphis, TN",        email:"h.simmons@fastroute.com",       phone:"+1 (901) 445-3300", employees:"1,001-5,000",  revenue:"$100M+",      score:85, verified:true,  tags:["Logistics","Supply Chain"] },
  { id:24, name:"Paul Winters",         title:"VP Commercial Lines",         department:"Sales",      seniority:"VP",       company:"Cornerstone Insurance",       industry:"Insurance",                          location:"Hartford, CT",       email:"p.winters@cornerstoneins.com",  phone:"+1 (860) 445-9900", employees:"501-1,000",    revenue:"$100M+",      score:82, verified:true,  tags:["Insurance","Commercial"] },
  { id:25, name:"Zoe Chambers",         title:"VP of Growth Marketing",      department:"Marketing",  seniority:"VP",       company:"Amplify Media Group",         industry:"Marketing and Advertising",           location:"New York, NY",       email:"z.chambers@amplifymedia.com",   phone:"+1 (212) 884-6600", employees:"51-200",       revenue:"$10M-$50M",   score:86, verified:true,  tags:["Growth","Performance Mktg"] },
  { id:26, name:"Hannah Goldstein",     title:"Managing Partner",            department:"Consulting", seniority:"Partner",  company:"Goldstein & Associates",      industry:"Management Consulting",               location:"Chicago, IL",        email:"h.goldstein@g-assoc.com",       phone:"+1 (312) 552-7700", employees:"11-50",        revenue:"$5M-$10M",    score:80, verified:true,  tags:["Consulting","Partner"] },
  { id:27, name:"Dr. Raj Subramaniam", title:"VP Clinical Development",      department:"Research",   seniority:"VP",       company:"GenVax Therapeutics",         industry:"Pharmaceuticals",                    location:"Cambridge, MA",      email:"r.subra@genvax.com",            phone:"+1 (617) 553-2200", employees:"201-500",      revenue:"$50M-$100M",  score:90, verified:true,  tags:["Pharma","Clinical"] },
  { id:28, name:"Marco Ricci",          title:"VP Revenue Management",       department:"Finance",    seniority:"VP",       company:"Prestige Hotel Group",        industry:"Hospitality",                        location:"Las Vegas, NV",      email:"m.ricci@prestigehotels.com",    phone:"+1 (702) 445-7700", employees:"1,001-5,000",  revenue:"$100M+",      score:79, verified:true,  tags:["Hospitality","Revenue Mgmt"] },
  { id:29, name:"Col. Steve Briggs",    title:"Director of Defense Programs",department:"Operations", seniority:"Director", company:"Sentinel Aerospace",          industry:"Defense & Space",                    location:"Huntsville, AL",     email:"s.briggs@sentinelaero.com",     phone:"+1 (256) 334-9900", employees:"1,001-5,000",  revenue:"$500M+",      score:87, verified:true,  tags:["Defense","Government"] },
  { id:30, name:"Dan Kowalski",         title:"VP Fleet Sales",              department:"Sales",      seniority:"VP",       company:"NovaDrive Motors",            industry:"Automotive",                         location:"Detroit, MI",        email:"d.kowalski@novadrive.com",      phone:"+1 (313) 774-8800", employees:"5,001-10,000", revenue:"$500M+",      score:82, verified:true,  tags:["Auto","Fleet Sales"] },
  { id:31, name:"Aisha Mensah",         title:"CTO",                         department:"IT",         seniority:"C-Suite",  company:"DataStream AI",               industry:"Computer Software",                  location:"Austin, TX",         email:"a.mensah@datastreamai.com",     phone:"+1 (512) 884-3300", employees:"51-200",       revenue:"$10M-$50M",   score:93, verified:true,  tags:["CTO","AI/ML","Decision Maker"] },
  { id:32, name:"Ray Huang",            title:"VP Product Management",       department:"Product",    seniority:"VP",       company:"ChipLogic Semiconductors",    industry:"Semiconductors",                     location:"San Jose, CA",       email:"r.huang@chiplogic.com",         phone:"+1 (408) 774-9900", employees:"1,001-5,000",  revenue:"$100M+",      score:89, verified:true,  tags:["Semiconductors","Product"] },
  { id:33, name:"Karen Oduya",          title:"Chief Underwriting Officer",  department:"Finance",    seniority:"C-Suite",  company:"Sentinel Life Group",         industry:"Insurance",                          location:"Omaha, NE",          email:"k.oduya@sentinellife.com",      phone:"+1 (402) 663-4400", employees:"1,001-5,000",  revenue:"$100M+",      score:88, verified:true,  tags:["C-Suite","Underwriting"] },
  { id:34, name:"Oliver Grant",         title:"VP of Customer Success",      department:"Support",    seniority:"VP",       company:"PlatformOne",                 industry:"SaaS",                               location:"San Francisco, CA",  email:"o.grant@platformone.io",        phone:"+1 (415) 663-7700", employees:"201-500",       revenue:"$10M-$50M",   score:80, verified:true,  tags:["CS Leader","SaaS"] },
];

const MOCK_TEAM = [
  { id:1, name:"Alex Rivera",  email:"alex.rivera@company.com",  role:"admin",   status:"active",  joined:"Jan 2026", lastActive:"Today",      avatar:"AR", searches:142, exports:28 },
  { id:2, name:"Jordan Lee",   email:"jordan.lee@company.com",   role:"manager", status:"active",  joined:"Feb 2026", lastActive:"Today",      avatar:"JL", searches:98,  exports:19 },
  { id:3, name:"Morgan Blake", email:"morgan.blake@company.com", role:"rep",     status:"active",  joined:"Feb 2026", lastActive:"Yesterday",  avatar:"MB", searches:74,  exports:11 },
  { id:4, name:"Taylor Kim",   email:"taylor.kim@company.com",   role:"rep",     status:"active",  joined:"Mar 2026", lastActive:"2 days ago", avatar:"TK", searches:61,  exports:8  },
  { id:5, name:"Casey Nguyen", email:"casey.nguyen@company.com", role:"viewer",  status:"active",  joined:"Mar 2026", lastActive:"1 week ago", avatar:"CN", searches:12,  exports:0  },
  { id:6, name:"Drew Patel",   email:"drew.patel@company.com",   role:"rep",     status:"invited", joined:"—",        lastActive:"—",          avatar:"DP", searches:0,   exports:0  },
];

const MOCK_BILLING = {
  plan:"Pro Team", seats:{ used:5, total:10, pricePerSeat:79 },
  credits:{ used:387, total:1000, resetDate:"Jun 1, 2026" },
  nextBill:{ date:"Jun 1, 2026", amount:790 },
  history:[
    { date:"May 1, 2026", amount:790, status:"paid" },
    { date:"Apr 1, 2026", amount:790, status:"paid" },
    { date:"Mar 1, 2026", amount:553, status:"paid" },
  ]
};

const PLANS = [
  {
    id:"starter", name:"Starter", tagline:"For solo reps and freelancers",
    monthlyPrice:39, yearlyPrice:29, credits:200, maxSeats:1,
    badge:null, highlight:false,
    features:["200 contact reveals/month","Basic search & filters","CSV export","Email verification","AI ice breakers","My Lists (up to 5)","Email support"],
    missing:["Team seats","Bulk enrichment","CRM integrations","Priority support","API access"],
  },
  {
    id:"pro", name:"Pro", tagline:"For growing sales teams",
    monthlyPrice:79, yearlyPrice:59, credits:1000, maxSeats:10,
    badge:"Most Popular", highlight:true,
    features:["1,000 shared credits/month","All search filters","CSV export (bulk & selective)","Real-time email + phone verification","Full AI panel","Unlimited lists","Team management & roles","HubSpot & Salesforce sync","Priority support"],
    missing:["Custom credit pools per seat","Dedicated account manager","SSO / SAML"],
  },
  {
    id:"team", name:"Team", tagline:"For scaling revenue orgs",
    monthlyPrice:149, yearlyPrice:119, credits:5000, maxSeats:50,
    badge:null, highlight:false,
    features:["5,000 shared credits/month","Everything in Pro","Custom credit pools per seat","Buyer intent signals","Job change tracking","Chrome extension","API access (full)","Zapier integration","Dedicated account manager","SSO / SAML","SLA-backed uptime"],
    missing:[],
  },
  {
    id:"enterprise", name:"Enterprise", tagline:"For large orgs with custom needs",
    monthlyPrice:null, yearlyPrice:null, credits:null, maxSeats:null,
    badge:null, highlight:false,
    features:["Unlimited credits & seats","Everything in Team","Custom data SLA","Org chart mapping","Custom AI models","White-label option","On-premise deployment","24/7 phone support","Custom contract & invoicing"],
    missing:[],
  },
];

const FAQS = [
  { q:"What is a credit?", a:"One credit = one contact reveal (verified email or phone). Searching and filtering is always free — you only spend a credit when you reveal contact details." },
  { q:"Do unused credits roll over?", a:"Credits reset monthly on your billing date. On Team and Enterprise plans you can purchase additional top-ups at any time." },
  { q:"Can I change plans anytime?", a:"Yes. Upgrade or downgrade at any time. Upgrades are prorated immediately; downgrades take effect at the next billing cycle." },
  { q:"Is there a free trial?", a:"Every paid plan starts with a 7-day free trial — no credit card required. Full access to all features during the trial." },
  { q:"How does team billing work?", a:"Pro and Team plans are billed per seat per month. Credits are shared across the team and managed by your Admin." },
  { q:"What happens if we go over our credit limit?", a:"You'll receive an email at 80% usage. Once exhausted you can purchase top-up credits ($0.10/credit) or upgrade. Contact reveals pause — your data and lists are never affected." },
  { q:"Do you offer nonprofit or startup discounts?", a:"Yes. Verified nonprofits receive 40% off. Seed-stage startups (under $1M ARR) receive 30% off for the first year." },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.cream}; font-family: 'DM Sans', sans-serif; color: ${T.ink}; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.paperd}; border-radius: 3px; }
  ::placeholder { color: ${T.inkmut}; }
  select { appearance: none; }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes spin    { to   { transform: rotate(360deg); } }
  @keyframes barFill { from { width:0 } to { width:100% } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.4; } }
  .row-hover:hover { background: ${T.paper} !important; }
  .btn-ghost:hover { background: ${T.paper} !important; }
  .tag-chip { display:inline-flex; align-items:center; font-size:11px; font-weight:500; padding:2px 8px; border-radius:3px; background:${T.paper}; border:1px solid ${T.border}; color:${T.inkm}; letter-spacing:.2px; }
  .input-base { width:100%; padding:9px 12px; background:${T.cream}; border:1px solid ${T.border}; border-radius:4px; color:${T.ink}; font-size:13px; font-family:'DM Sans',sans-serif; outline:none; transition:border-color .15s; }
  .input-base:focus { border-color:${T.green}; box-shadow:0 0 0 2px ${T.greenl}; }
`;

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function ScorePill({ score }) {
  const [c, bg] = score >= 90 ? [T.green, T.greenl] : score >= 75 ? [T.amber, T.amberl] : [T.red, T.redl];
  return <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:500, color:c, background:bg, padding:"2px 7px", borderRadius:3, letterSpacing:.5 }}>{score}</span>;
}

function RoleBadge({ role }) {
  const rp = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.rep;
  return <span style={{ fontSize:10, fontWeight:600, color:rp.color, background:rp.bg, border:`1px solid ${rp.border}`, padding:"2px 7px", borderRadius:3, textTransform:"uppercase", letterSpacing:.8 }}>{rp.label}</span>;
}

function Spinner() {
  return <div style={{ width:16, height:16, border:`2px solid ${T.paperd}`, borderTopColor:T.green, borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }} />;
}

function SectionHeading({ label, sub }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:28, color:T.ink, letterSpacing:-.5, lineHeight:1.1 }}>{label}</div>
      {sub && <div style={{ fontSize:13, color:T.inkm, marginTop:5 }}>{sub}</div>}
    </div>
  );
}

// ─── AI PANEL ─────────────────────────────────────────────────────────────────
function AIPanel({ contact, onClose, bookingLink }) {
  const [tab, setTab]       = useState("ice");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState("");

  const prompts = {
    ice:   `You are a world-class B2B sales coach. Write 3 highly personalized conversation starters for this prospect. Each 1-2 sentences. Specific, natural, no clichés.\n\nProspect: ${contact.name}, ${contact.title} at ${contact.company} (${contact.industry}, ${contact.location}, ${contact.employees} employees).\n\nFormat: numbered list, no intro.`,
    score: `You are a B2B sales intelligence AI. Analyze this prospect:\n1. Lead score rationale (2-3 sentences for ${contact.score}/100)\n2. Top 3 buying signals\n3. One risk factor\n\nProspect: ${contact.name}, ${contact.title} at ${contact.company} (${contact.industry}, ${contact.revenue} revenue). Tags: ${contact.tags.join(", ")}\n\nBe direct and concise.`,
    email: `Write a short personalized cold outreach email (under 120 words) from a sales rep at a B2B prospecting software company. Sound human, not salesy.\n\nProspect: ${contact.name}, ${contact.title} at ${contact.company} (${contact.industry}).\n\nEnd with a call to action to book a quick call.${bookingLink ? ` Use this booking link: ${bookingLink}` : ""}\n\nFormat:\nSubject: [subject]\n[body]`,
  };

  async function run(t) {
    setTab(t); setResult(""); setLoading(true);
    try {
      const res = await fetch("/api/claude", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ model:ANTHROPIC_MODEL, max_tokens:1000, messages:[{ role:"user", content:prompts[t] }] }),
      });
      const d = await res.json();
      setResult(d.content?.[0]?.text || "No response.");
    } catch { setResult("Connection error — please retry."); }
    setLoading(false);
  }

  useEffect(() => { run("ice"); }, []);

  const tabs = [{ id:"ice", label:"Ice Breakers" }, { id:"score", label:"Score Analysis" }, { id:"email", label:"Draft Email" }];

  return (
    <div style={{ position:"fixed", top:0, right:0, bottom:0, width:400, background:T.cream, borderLeft:`1px solid ${T.border}`, zIndex:200, display:"flex", flexDirection:"column", boxShadow:`-6px 0 32px ${T.shadowd}` }}>
      <div style={{ padding:"20px 24px 0", borderBottom:`1px solid ${T.border}`, paddingBottom:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:T.green, textTransform:"uppercase", letterSpacing:1.5, marginBottom:4 }}>AI Intelligence</div>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:T.ink }}>{contact.name}</div>
            <div style={{ fontSize:12, color:T.inkm }}>{contact.title} · {contact.company}</div>
          </div>
          <button onClick={onClose} style={{ background:T.paper, border:`1px solid ${T.border}`, color:T.inkm, width:30, height:30, borderRadius:4, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>
        <div style={{ display:"flex", gap:0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => run(t.id)} style={{ background:"none", border:"none", borderBottom:`2px solid ${tab===t.id ? T.green : "transparent"}`, padding:"8px 14px", fontSize:12, fontWeight:tab===t.id ? 600 : 400, color:tab===t.id ? T.green : T.inkm, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .15s", whiteSpace:"nowrap" }}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:24 }}>
        {loading
          ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:160, gap:12 }}><Spinner /><div style={{ fontSize:12, color:T.inkm }}>Generating analysis…</div></div>
          : <div style={{ fontSize:13, lineHeight:1.85, color:T.inkl, whiteSpace:"pre-wrap" }}>{result}</div>
        }
      </div>
      <div style={{ padding:16, borderTop:`1px solid ${T.border}` }}>
        <button onClick={() => run(tab)} style={{ width:"100%", padding:"9px", background:T.green, border:"none", borderRadius:4, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>↺ Regenerate</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [appView, setAppView]   = useState("splash");
  const [authMode, setAuthMode] = useState("login");
  const [loginData, setLoginData]   = useState({ email:"", password:"" });
  const [signupData, setSignupData] = useState({ name:"", email:"", password:"", confirm:"" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [authError, setAuthError]   = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [splashDone, setSplashDone]   = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sbTeam, setSbTeam]           = useState(null);   // live Supabase team row
  const [sbLoading, setSbLoading]     = useState(false);  // global loading flag
  const [sbReady, setSbReady]         = useState(false);  // session restore done
  const [selectedPlan, setSelectedPlan] = useState(null);   // plan chosen on pricing page
  const [pricingYearly, setPricingYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Main app state
  const [view, setView]               = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters]         = useState({ industry:"All Industries", naicsCode:null, size:"Any Size", seniority:"Any Seniority", department:"Any Department", revenue:"Any Revenue", state:"Any State", city:"" });
  const [selectedContact, setSelectedContact] = useState(null);
  const [aiContact, setAiContact]     = useState(null);
  const [savedIds, setSavedIds]         = useState(new Set());
  const [savedContacts, setSavedContacts] = useState([]);  // full contact objects
  const [savedRowIds, setSavedRowIds]     = useState({});  // contact id -> supabase row id
  const [pipelineStages, setPipelineStages] = useState({}); // contact id -> stage
  const [draggedId, setDraggedId]         = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [contactForm, setContactForm]   = useState({ name:"", email:"", company:"", subject:"General inquiry", message:"" });
  const [contactSent, setContactSent]   = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState("");
  const [selectedForExport, setSelectedForExport] = useState(new Set());
  const [selectMode, setSelectMode]   = useState(false);
  const [pdlContacts, setPdlContacts]   = useState([]);
  const [pdlTotal, setPdlTotal]         = useState(0);
  const [pdlLoading, setPdlLoading]     = useState(false);
  const [pdlError, setPdlError]         = useState(null);
  const [pdlPage, setPdlPage]           = useState(1);
  const [pdlHasMore, setPdlHasMore]     = useState(false);
  const [useLiveData, setUseLiveData]   = useState(false);
  const debounceRef                     = useRef(null);
  const [lists, setLists]             = useState([{ id:1, name:"Hot Prospects Q2", count:3 }, { id:2, name:"Enterprise Targets", count:12 }]);
  const [teamMembers, setTeamMembers] = useState([{ id:1, name:"", email:"", role:"admin", status:"active", joined:"", lastActive:"Today", avatar:"", searches:0, exports:0 }]);
  const [activeUserId, setActiveUserId] = useState(1);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showCancelFlow, setShowCancelFlow]   = useState(false);
  const [cancelStep, setCancelStep]           = useState(1);  // 1=warning 2=reason 3=offer 4=confirm
  const [cancelReason, setCancelReason]       = useState("");
  const [cancelPassword, setCancelPassword]   = useState("");
  const [cancelError, setCancelError]         = useState("");
  const [cancelComplete, setCancelComplete]   = useState(false);
  const [bookingLink, setBookingLink]         = useState("");
  const [bulkEmailContacts, setBulkEmailContacts] = useState([]);
  const [bulkEmailResults, setBulkEmailResults]   = useState({});
  const [bulkEmailLoading, setBulkEmailLoading]   = useState(false);
  const [showBulkEmail, setShowBulkEmail]         = useState(false);
  const [inviteRole, setInviteRole]   = useState("rep");
  // Dynamic billing derived from selected plan
  const activePlan   = PLANS.find(p => p.id === selectedPlan) || PLANS[1]; // default Pro
  const activeBilling = {
    plan: activePlan.name,
    seats: { used:5, total: activePlan.maxSeats || 10, pricePerSeat: activePlan.monthlyPrice || 79 },
    credits: { used:387, total: activePlan.credits || 1000, resetDate:"Jun 1, 2026" },
    nextBill: { date:"Jun 1, 2026", amount: activePlan.monthlyPrice ? activePlan.monthlyPrice * 5 : 790 },
    history: MOCK_BILLING.history,
  };
  const [onboardStep, setOnboardStep] = useState(0);
  const [onboardData, setOnboardData] = useState({ name:"", company:"", role:"", goal:"" });

  const activeUser = teamMembers.find(u => u.id === activeUserId) || teamMembers[0] || { role:"admin", name:"", avatar:"" };
  const perms      = ROLE_PERMISSIONS[activeUser.role] || ROLE_PERMISSIONS.admin;

  // Display name — always use real logged-in user from Supabase
  const displayName   = currentUser ? (onboardData.name || currentUser.email.split("@")[0]) : (activeUser.name || "User");
  const displayEmail  = currentUser ? currentUser.email : (activeUser.email || "");
  const displayAvatar = displayName ? displayName.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() : "U";

  // Live PDL search function
  const runPDLSearch = useCallback(async (page = 1, append = false) => {
    setPdlLoading(true);
    setPdlError(null);
    try {
      const result = await searchPeople({ filters, query: searchQuery, page, pageSize: 5, naicsCodes: filters.naicsCode ? [filters.naicsCode.code] : [] });
      setPdlContacts(prev => append ? [...prev, ...result.contacts] : result.contacts);
      setPdlTotal(result.total);
      setPdlHasMore(result.hasMore);
      setPdlPage(page);
    } catch(err) {
      setPdlError("Live search error — check your PDL API key or try again.");
      // Don't reset to sample data — keep live mode active so user can retry
    }
    setPdlLoading(false);
  }, [filters, searchQuery, filters.naicsCode?.code]);

  // Re-run PDL search when filters or query change while in live mode
  useEffect(() => {
    if (!useLiveData) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runPDLSearch(1, false);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [filters, searchQuery, useLiveData, filters.naicsCode?.code]);

  // Mock data filtered locally
  const mockFiltered = MOCK_CONTACTS.slice(0, 10).filter(c => {
    const q = searchQuery.toLowerCase();
    const mQ = !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q) || c.location.toLowerCase().includes(q);
    const mI = filters.naicsCode ? c.industry.toLowerCase().includes(filters.naicsCode.name.split(" ")[0].toLowerCase()) : (filters.industry === "All Industries" || c.industry === filters.industry);
    const mS = filters.size     === "Any Size"       || c.employees === filters.size;
    const mSn= filters.seniority=== "Any Seniority"  || c.seniority === filters.seniority;
    const mD = filters.department==="Any Department" || c.department === filters.department;
    const mR = filters.revenue==="Any Revenue"   || c.revenue === filters.revenue;
    return mQ && mI && mS && mSn && mD && mR;
  });

  // Use live PDL data if toggled on, otherwise use mock
  const filteredContacts = useLiveData ? pdlContacts : mockFiltered;
  const sorted = [...filteredContacts].sort((a,b) => b.score - a.score);
  const displayTotal = useLiveData ? pdlTotal : mockFiltered.length;

  async function toggleSave(contactOrId) {
    const id = typeof contactOrId === 'object' ? contactOrId.id : contactOrId;
    const contact = typeof contactOrId === 'object' ? contactOrId : MOCK_CONTACTS.find(c=>c.id===id) || pdlContacts.find(c=>c.id===id);
    if (savedIds.has(id)) {
      // Unsave
      setSavedIds(p => { const n=new Set(p); n.delete(id); return n; });
      setSavedContacts(p => p.filter(c=>c.id!==id));
      setPipelineStages(p => { const n={...p}; delete n[id]; return n; });
      // Delete from Supabase
      if (savedRowIds[id] && currentUser) {
        try { await sb.from("saved_contacts").delete().eq("id", savedRowIds[id]); } catch(e) { console.warn(e); }
      }
    } else {
      // Save
      setSavedIds(p => new Set([...p, id]));
      if (contact) {
        setSavedContacts(p => [...p.filter(c=>c.id!==id), contact]);
        setPipelineStages(p => ({ ...p, [id]: "New" }));
        // Save to Supabase
        if (currentUser) {
          try {
            // Use known team ID or look it up
            let teamId = sbTeam?.id || 'd48bb0fa-89e2-4cfc-9b93-3e5f880b802c';
            const { data, error } = await sb.from("saved_contacts").insert({
              user_id: currentUser.id,
              team_id: teamId,
              apollo_id: String(id),
              contact_data: { ...contact, pipeline_stage: "New" }
            }).select("id").single();
            if (error) { console.warn("Save error:", error.message); }
            else if (data) { setSavedRowIds(p => ({ ...p, [id]: data.id })); }
          } catch(e) { console.warn("Save contact error:", e.message); }
        }
      }
    }
  }

  async function moveToStage(contactId, newStage) {
    setPipelineStages(p => ({ ...p, [contactId]: newStage }));
    // Update in Supabase
    if (savedRowIds[contactId] && currentUser) {
      try {
        const contact = savedContacts.find(c=>c.id===contactId);
        if (contact) {
          await sb.from("saved_contacts").update({
            contact_data: { ...contact, pipeline_stage: newStage }
          }).eq("id", savedRowIds[contactId]);
        }
      } catch(e) { console.warn(e); }
    }
  }
  function toggleExport(id) { setSelectedForExport(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; }); }

  function downloadCSV(contacts) {
    const hdr = ["Name","Title","Company","Industry","Department","Seniority","Location","Email","Phone","Employees","Revenue","AI Score","Verified","Tags"];
    const rows = contacts.map(c => [c.name,c.title,c.company,c.industry,c.department,c.seniority,c.location,c.email,c.phone,c.employees,c.revenue,c.score,c.verified?"Yes":"No",c.tags.join("; ")].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
    const blob = new Blob([[hdr.join(","),...rows].join("\n")], { type:"text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `zelvarix-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  function sendInvite() {
    if (!inviteEmail.includes("@")) return;
    const initials = inviteEmail.split("@")[0].slice(0,2).toUpperCase();
    setTeamMembers(p => [...p, { id:Date.now(), name:inviteEmail.split("@")[0], email:inviteEmail, role:inviteRole, status:"invited", joined:"—", lastActive:"—", avatar:initials, searches:0, exports:0 }]);
    setInviteEmail(""); setShowInviteModal(false);
  }

  // ── Load booking link from localStorage ─────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('zelvarix_booking_link');
    if (saved) setBookingLink(saved);
  }, []);

  // ── Google Analytics ───────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Load GA4
    const script1 = document.createElement('script');
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script1.async = true;
    document.head.appendChild(script1);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
    // Load Crisp chat
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    const script2 = document.createElement('script');
    script2.src = 'https://client.crisp.chat/l.js';
    script2.async = true;
    document.head.appendChild(script2);
  }, []);

  // ── Auto-logout after 15 minutes of inactivity ──────────────────────────
  const inactivityRef = useRef(null);

  function resetInactivityTimer() {
    clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(async () => {
      await sb.auth.signOut();
      setCurrentUser(null);
      setSbTeam(null);
      setAppView("auth");
    }, 15 * 60 * 1000); // 15 minutes
  }

  useEffect(() => {
    if (appView !== "app") return;
    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart", "click"];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer(); // start timer on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      clearTimeout(inactivityRef.current);
    };
  }, [appView]);

  // Session restore + splash
  useEffect(() => {
    async function restoreSession() {
      const { data } = await sb.auth.getSession();
      if (data.session?.user) {
        const user = data.session.user;
        setCurrentUser(user);
        // Load profile
        const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
        if (profile) setOnboardData({ name: profile.name||"", company: profile.company||"", role: profile.role||"", goal: profile.goal||"" });
        // Load team
        const { data: mem } = await sb.from("team_members").select("team_id, role").eq("user_id", user.id).maybeSingle();
        if (mem) {
          const { data: team } = await sb.from("teams").select("*").eq("id", mem.team_id).single();
          if (team) { setSbTeam(team); setSelectedPlan(team.plan); }
          const { data: members } = await sb.from("team_members").select("id, user_id, role, status, joined_at").eq("team_id", mem.team_id);
          if (members && members.length > 0) {
            const userIds = members.map(m => m.user_id).filter(Boolean);
            const { data: profilesData } = await sb.from("profiles").select("id, name").in("id", userIds);
            const profileMap = {};
            (profilesData||[]).forEach(p => { profileMap[p.id] = p; });
            setTeamMembers(members.map((m,i) => {
              const p = profileMap[m.user_id];
              return { id: p?.id || m.user_id || i, name: p?.name || "Member", email:"", role: m.role, status: m.status, joined: new Date(m.joined_at).toLocaleDateString("en-US",{month:"short",year:"numeric"}), lastActive:"—", avatar:(p?.name||"??").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase(), searches:0, exports:0 };
            }));
          }
          // Load lists
          const { data: lsts } = await sb.from("lists").select("id, name, list_contacts(count)").eq("team_id", mem.team_id);
          if (lsts) setLists(lsts.map(l => ({ id: l.id, name: l.name, count: l.list_contacts?.[0]?.count || 0 })));
          // Load saved contacts
          const { data: saved, error: savedError } = await sb.from("saved_contacts").select("id, contact_data").eq("user_id", user.id);
          console.log("Loaded saved contacts:", saved?.length || 0, "error:", savedError?.message);
          if (saved && saved.length > 0) {
            const ids = new Set();
            const contacts = [];
            const rowIds = {};
            const stages = {};
            saved.forEach(s => {
              const cd = s.contact_data;
              if (!cd) return;
              const cid = cd.id;
              if (cid) {
                ids.add(cid);
                contacts.push(cd);
                rowIds[cid] = s.id;
                stages[cid] = cd.pipeline_stage || "New";
              }
            });
            setSavedIds(ids);
            setSavedContacts(contacts);
            setSavedRowIds(rowIds);
            setPipelineStages(stages);
            console.log("Pipeline stages loaded:", stages);
          }
        }
        setSbReady(true);
        setAppView("app");
        return;
      }
      setSbReady(true);
    }
    if (appView==="splash") {
      const t1 = setTimeout(()=>setSplashDone(true), 2000);
      restoreSession().then(() => {
        // Only advance to pricing if session restore didn't redirect to app
        setAppView(prev => prev === "splash" ? "pricing" : prev);
      });
      const t2 = setTimeout(()=>setAppView(prev => prev==="splash" ? "pricing" : prev), 2700);
      return ()=>{ clearTimeout(t1); clearTimeout(t2); };
    }
  },[appView]);

  async function handleLogin() {
    setAuthError("");
    if (!loginData.email||!loginData.password) { setAuthError("Please fill in all fields."); return; }
    if (!loginData.email.includes("@"))         { setAuthError("Enter a valid email."); return; }
    setAuthLoading(true);
    const { data, error } = await sb.auth.signInWithPassword({ email: loginData.email, password: loginData.password });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    const user = data.user;
    setCurrentUser(user);
    // Load profile
    const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).single();
    if (profile) setOnboardData({ name: profile.name||"", company: profile.company||"", role: profile.role||"", goal: profile.goal||"" });
    // Load team
    const { data: mem } = await sb.from("team_members").select("team_id, role").eq("user_id", user.id).maybeSingle();
    if (mem) {
      const { data: team } = await sb.from("teams").select("*").eq("id", mem.team_id).single();
      if (team) { setSbTeam(team); setSelectedPlan(team.plan); }
      const { data: lsts } = await sb.from("lists").select("id, name, list_contacts(count)").eq("team_id", mem.team_id);
      if (lsts) setLists(lsts.map(l => ({ id: l.id, name: l.name, count: l.list_contacts?.[0]?.count || 0 })));
      const { data: saved, error: savedErr } = await sb.from("saved_contacts").select("id, contact_data").eq("user_id", user.id);
      console.log("Login - saved contacts:", saved?.length || 0, "error:", savedErr?.message);
      if (saved && saved.length > 0) {
        const ids = new Set();
        const contacts = [];
        const rowIds = {}, stages = {};
        saved.forEach(s => {
          const cd = s.contact_data;
          if (!cd) return;
          const cid = cd.id;
          if (cid) { ids.add(cid); contacts.push(cd); rowIds[cid]=s.id; stages[cid]=cd.pipeline_stage||"New"; }
        });
        setSavedIds(ids);
        setSavedContacts(contacts);
        setSavedRowIds(rowIds);
        setPipelineStages(stages);
      }
    }
    setAppView("app");
  }

  async function handleSignup() {
    setAuthError("");
    if (!signupData.name||!signupData.email||!signupData.password||!signupData.confirm) { setAuthError("Please fill in all fields."); return; }
    if (!signupData.email.includes("@"))     { setAuthError("Enter a valid email."); return; }
    if (signupData.password.length<8)        { setAuthError("Password must be 8+ characters."); return; }
    if (signupData.password!==signupData.confirm) { setAuthError("Passwords do not match."); return; }
    if (!termsAccepted) { setAuthError("You must agree to the Terms of Service and Privacy Policy to continue."); return; }
    setAuthLoading(true);
    // 1. Create Supabase auth user
    const { data, error } = await sb.auth.signUp({ email: signupData.email, password: signupData.password, options: { data: { name: signupData.name }, emailRedirectTo: 'https://www.zelvarix.ai' } });
    if (error) { setAuthLoading(false); setAuthError(error.message); return; }
    const user = data.user;
    setCurrentUser(user);
    // 2. Create profile
    await sb.from("profiles").insert({ id: user.id, name: signupData.name, terms_accepted_at: new Date().toISOString() });
    // 3. Create team
    const planCredits = { starter:200, pro:1000, team:5000, enterprise:999999 };
    const planSeats   = { starter:1,   pro:10,   team:50,   enterprise:9999   };
    const pid = selectedPlan || "pro";
    const { data: team } = await sb.from("teams").insert({ name:`${signupData.name}'s Team`, plan:pid, credits_total:planCredits[pid]||1000, credits_used:0, seats_total:planSeats[pid]||10 }).select().single();
    if (team) {
      setSbTeam(team);
      await sb.from("team_members").insert({ team_id: team.id, user_id: user.id, role:"admin", status:"active" });
    }
    // 4. Send welcome email (fire-and-forget — never blocks signup)
    fetch('/api/welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: signupData.name, email: signupData.email }),
    }).catch(e => console.warn('Welcome email error:', e));
    setAuthLoading(false);
    setOnboardData(p=>({...p, name:signupData.name}));
    setAppView("onboard");  // Always go to onboarding after signup
  }

  // ── ONBOARDING ─────────────────────────────────────────────────────────────
  const onboardSteps = [
    { title:"Tell us about yourself", sub:"We'll personalise your experience.", field:null },
    { title:"What's your name?",      field:"name",    placeholder:"Full name" },
    { title:"Your company?",          field:"company", placeholder:"Company name" },
    { title:"Your role?",             field:"role",    placeholder:"e.g. AE, SDR, Founder, VP Sales" },
    { title:"Primary goal?",          field:"goal",    placeholder:"e.g. Book 10 demos/month" },
  ];


  // ══════════════════════════════════════════════════════════════════════════
  // PRICING PAGE — integrated
  // ══════════════════════════════════════════════════════════════════════════
  if (appView==="pricing") {
    const btnStyle = (plan) => ({
      width:"100%", padding:"11px",
      background: plan.highlight ? T.green : plan.id==="enterprise" ? T.ink : "#fff",
      border: `1.5px solid ${plan.highlight ? T.green : plan.id==="enterprise" ? T.ink : T.border}`,
      borderRadius:5, color: plan.highlight||plan.id==="enterprise" ? "#fff" : T.ink,
      fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
    });
    function choosePlan(plan) {
      setSelectedPlan(plan.id);
      if (plan.id==="enterprise") { alert("Our sales team will be in touch! For now, enjoy full Team access."); setSelectedPlan("team"); }
      // If user already logged in, go straight to billing; else go to auth
      if (currentUser) { setAppView("app"); setView("billing"); }
      else { setAppView("auth"); setAuthMode("signup"); }
    }
    return (
      <div style={{ minHeight:"100vh", background:T.cream, fontFamily:"'DM Sans',sans-serif", color:T.ink }}>
        <style>{GLOBAL_CSS}</style>
        {/* Nav */}
        <nav style={{ height:56, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", padding:"0 40px", justifyContent:"space-between", background:"#fff", position:"sticky", top:0, zIndex:50 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:T.ink, letterSpacing:-.3 }}>Zelvarix<span style={{ color:T.green, fontStyle:"italic", fontSize:"0.85em" }}>.ai</span></div>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            {currentUser && <button onClick={()=>setAppView("app")} style={{ fontSize:13, color:T.inkm, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>← Back to app</button>}
            <button onClick={()=>{ setAppView("auth"); setAuthMode("login"); }} style={{ padding:"7px 16px", background:T.ink, border:"none", borderRadius:4, color:T.cream, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Sign in →</button>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ textAlign:"center", padding:"72px 24px 52px", maxWidth:680, margin:"0 auto" }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.green, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Simple, transparent pricing</div>
          <h1 style={{ fontFamily:"'Instrument Serif',serif", fontSize:52, color:T.ink, lineHeight:1.05, letterSpacing:-1.5, marginBottom:14 }}>
            Pay for what you<br /><span style={{ color:T.green, fontStyle:"italic" }}>actually use.</span>
          </h1>
          <p style={{ fontSize:16, color:T.inkm, lineHeight:1.7, marginBottom:32 }}>
            7-day free trial on every plan. No card required.<br />Searching is always free — credits only spend on contact reveals.
          </p>
          {/* Toggle */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:0, background:"#fff", border:`1px solid ${T.border}`, borderRadius:40, padding:"4px 5px" }}>
            <button onClick={()=>setPricingYearly(false)} style={{ padding:"6px 18px", borderRadius:30, border:"none", background:!pricingYearly?T.ink:"transparent", color:!pricingYearly?T.cream:T.inkm, fontWeight:!pricingYearly?600:400, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .2s" }}>Monthly</button>
            <button onClick={()=>setPricingYearly(true)}  style={{ padding:"6px 18px", borderRadius:30, border:"none", background:pricingYearly?T.ink:"transparent",  color:pricingYearly?T.cream:T.inkm,  fontWeight:pricingYearly?600:400,  fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .2s", display:"flex", alignItems:"center", gap:6 }}>
              Annually <span style={{ fontSize:10, fontWeight:700, background:T.green, color:"#fff", padding:"2px 6px", borderRadius:10 }}>Save 25%</span>
            </button>
          </div>
        </section>

        {/* Plan cards */}
        <section style={{ maxWidth:1120, margin:"0 auto", padding:"0 24px 72px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, alignItems:"start" }}>
          {PLANS.map(plan => {
            const price = pricingYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const isSelected = selectedPlan === plan.id;
            return (
              <div key={plan.id} style={{ background: plan.highlight ? T.ink : plan.id==="starter" ? T.paper : plan.id==="team" ? T.greenl : T.amberl, border:`1.5px solid ${isSelected ? T.green : plan.highlight ? T.ink : plan.id==="starter" ? T.border : plan.id==="team" ? T.greenb : T.amberb}`, borderRadius:8, padding:"26px 22px", display:"flex", flexDirection:"column", position:"relative", boxShadow: plan.highlight ? `0 8px 40px rgba(26,24,20,.18)` : isSelected ? `0 0 0 2px ${T.greenb}` : "0 1px 4px rgba(26,24,20,.05)" }}>
                {plan.badge && <div style={{ position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)", background:T.green, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 12px", borderRadius:20, letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap" }}>{plan.badge}</div>}
                {isSelected && <div style={{ position:"absolute", top:-11, right:12, background:T.greenm, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20, letterSpacing:.8, textTransform:"uppercase" }}>Selected ✓</div>}
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:21, color:plan.highlight?"#fff":T.ink, marginBottom:3 }}>{plan.name}</div>
                  <div style={{ fontSize:12, color:plan.highlight?"rgba(255,255,255,.5)":T.inkm }}>{plan.tagline}</div>
                </div>
                <div style={{ marginBottom:18, borderBottom:`1px solid ${plan.highlight?"rgba(255,255,255,.1)":T.border}`, paddingBottom:18 }}>
                  {price ? (
                    <>
                      <div style={{ display:"flex", alignItems:"baseline", gap:3 }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:36, fontWeight:500, color:plan.highlight?"#fff":T.ink, lineHeight:1 }}>${price}</span>
                        <span style={{ fontSize:12, color:plan.highlight?"rgba(255,255,255,.4)":T.inkm }}>/seat/mo</span>
                      </div>
                      {pricingYearly && <div style={{ fontSize:11, color:T.green, marginTop:3, fontWeight:500 }}>Save ${(plan.monthlyPrice-plan.yearlyPrice)*12}/yr</div>}
                    </>
                  ) : (
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:32, color:plan.highlight?"#fff":T.ink, lineHeight:1 }}>Custom</div>
                  )}
                  <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, color:plan.highlight?"rgba(255,255,255,.55)":T.inkm, background:plan.highlight?"rgba(255,255,255,.08)":T.paper, border:`1px solid ${plan.highlight?"rgba(255,255,255,.12)":T.border}`, padding:"2px 7px", borderRadius:3 }}>
                      {plan.maxSeats ? `${plan.maxSeats} seat${plan.maxSeats>1?"s":""}` : "Unlimited seats"}
                    </span>
                    <span style={{ fontSize:11, color:plan.highlight?"rgba(255,255,255,.55)":T.inkm, background:plan.highlight?"rgba(255,255,255,.08)":T.paper, border:`1px solid ${plan.highlight?"rgba(255,255,255,.12)":T.border}`, padding:"2px 7px", borderRadius:3 }}>
                      {plan.credits ? `${plan.credits.toLocaleString()} credits/mo` : "Unlimited credits"}
                    </span>
                  </div>
                </div>
                <button onClick={()=>choosePlan(plan)} style={btnStyle(plan)}>{plan.id==="enterprise" ? "Talk to sales" : "Start free trial"}</button>
                <div style={{ marginTop:18, flex:1 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:7, marginBottom:8 }}>
                      <span style={{ color:T.green, fontSize:12, flexShrink:0, marginTop:1 }}>✓</span>
                      <span style={{ fontSize:12, color:plan.highlight?"rgba(255,255,255,.78)":T.inkl, lineHeight:1.4 }}>{f}</span>
                    </div>
                  ))}
                  {plan.missing.map(f => (
                    <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:7, marginBottom:8 }}>
                      <span style={{ color:plan.highlight?"rgba(255,255,255,.2)":T.inkmut, fontSize:12, flexShrink:0, marginTop:1 }}>✕</span>
                      <span style={{ fontSize:12, color:plan.highlight?"rgba(255,255,255,.22)":T.inkmut, lineHeight:1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Credit explainer */}
        <section style={{ background:"#fff", borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, padding:"52px 24px" }}>
          <div style={{ maxWidth:860, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:36 }}>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:32, color:T.ink, letterSpacing:-.5, marginBottom:6 }}>How credits work</div>
              <div style={{ fontSize:14, color:T.inkm }}>Transparent, simple, never surprising.</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:28 }}>
              {[
                { n:"01", title:"Search freely",   body:"Filter across 1.3B+ contacts by industry, seniority, company size, and department. Browsing results never costs a credit." },
                { n:"02", title:"Reveal to spend", body:"One credit is used when you reveal a verified email or direct phone number. You control exactly what you spend." },
                { n:"03", title:"Team pooling",    body:"Credits are shared across your team on Pro and Team plans. Admins can set per-seat limits to keep usage balanced." },
              ].map(item => (
                <div key={item.n} style={{ borderTop:`2px solid ${T.green}`, paddingTop:18 }}>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:T.inkmut, marginBottom:8, letterSpacing:1 }}>{item.n}</div>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:19, color:T.ink, marginBottom:8 }}>{item.title}</div>
                  <div style={{ fontSize:13, color:T.inkm, lineHeight:1.75 }}>{item.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth:680, margin:"0 auto", padding:"64px 24px" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:32, color:T.ink, letterSpacing:-.5, marginBottom:6 }}>Frequently asked</div>
            <div style={{ fontSize:14, color:T.inkm }}>Everything about pricing, in plain English.</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
            {FAQS.map((faq,i) => (
              <div key={i} style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, overflow:"hidden" }}>
                <button onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"15px 20px", background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textAlign:"left" }}>
                  <span style={{ fontSize:14, fontWeight:500, color:T.ink }}>{faq.q}</span>
                  <span style={{ fontSize:18, color:T.green, flexShrink:0, marginLeft:12, transition:"transform .2s", display:"inline-block", transform:openFaq===i?"rotate(45deg)":"none" }}>+</span>
                </button>
                {openFaq===i && <div style={{ padding:"0 20px 14px", fontSize:13, color:T.inkm, lineHeight:1.75, borderTop:`1px solid ${T.border}`, paddingTop:12 }}>{faq.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={{ background:T.greenl, borderTop:`1px solid ${T.greenb}`, padding:"64px 24px", textAlign:"center" }}>
          <div style={{ maxWidth:520, margin:"0 auto" }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:38, color:T.ink, letterSpacing:-1, marginBottom:10, lineHeight:1.1 }}>Ready to find your next best customer?</div>
            <div style={{ fontSize:14, color:T.inkm, marginBottom:28, lineHeight:1.7 }}>Start your 7-day free trial. No credit card required.<br />Full access to all Pro features from day one.</div>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={()=>choosePlan(PLANS[1])} style={{ padding:"12px 28px", background:T.green, border:"none", borderRadius:5, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Start Pro free →</button>
              <button onClick={()=>{ setAppView("auth"); setAuthMode("login"); }} style={{ padding:"12px 22px", background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, color:T.inkl, fontWeight:500, fontSize:15, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Sign in</button>
            </div>
            <div style={{ marginTop:14, fontSize:12, color:T.inkmut }}>No card required · Cancel anytime · 7-day trial on all plans</div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background:T.ink, padding:"32px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:T.cream }}>Zelvarix<span style={{ color:T.greenb, fontStyle:"italic", fontSize:"0.85em" }}>.ai</span></div>
          <div style={{ display:"flex", gap:20 }}>
            {[["privacy","Privacy"],["terms","Terms"],["cookies","Cookies"],["security","Security"],["contact","Contact"],["about","About"]].map(([id,l])=><button key={id} onClick={()=>setAppView(id)} style={{ fontSize:12, color:T.inkm, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{l}</button>)}
          </div>
          <div style={{ fontSize:11, color:T.inkm }}>© 2026 Zelvarix.ai</div>
        </footer>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LEGAL / CONTACT / ABOUT PAGES
  // ══════════════════════════════════════════════════════════════════════════
  const legalPages = ["privacy", "terms", "cookies", "contact", "about", "security"];

  async function submitContact() {
    if (!contactForm.name || !contactForm.email || !contactForm.message) { setContactError("Please fill in all required fields."); return; }
    setContactSending(true); setContactError("");
    try {
      const res = await fetch('/api/contact', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(contactForm) });
      if (!res.ok) throw new Error('Send failed');
      setContactSent(true);
    } catch { setContactError("Failed to send. Please email support@zelvarix.ai directly."); }
    setContactSending(false);
  }
  if (legalPages.includes(appView)) {
    const pages = {
      privacy: {
        title: "Privacy Policy",
        lastUpdated: "June 1, 2026",
        content: [
          { h: "1. Information We Collect", p: "We collect information you provide directly to us when you create an account, including your name, email address, company name, and role. We also collect usage data including searches performed, contacts viewed, lists created, and features used. We use cookies and similar technologies to maintain your session and improve your experience." },
          { h: "2. How We Use Your Information", p: "We use your information to provide and improve the Zelvarix platform, process transactions, send transactional and promotional emails (with your consent), respond to support requests, and comply with legal obligations. We do not sell your personal information to third parties." },
          { h: "3. Data Sharing", p: "We share your data with trusted service providers including Supabase (database and authentication), People Data Labs (contact data), Anthropic (AI processing), Stripe (payment processing), and Vercel (hosting). Each provider is bound by data processing agreements and processes data only as instructed by us." },
          { h: "4. Contact Data", p: "Zelvarix provides access to publicly available B2B professional contact information sourced from People Data Labs. This data is used solely for legitimate B2B prospecting purposes. We do not store contact data you view — it is retrieved in real time and not retained on our servers beyond your session." },
          { h: "5. Data Retention", p: "We retain your account data for as long as your account is active. Upon cancellation, your account data is retained for 30 days to allow reactivation, after which it is permanently deleted. You may request deletion of your data at any time by emailing privacy@zelvarix.ai." },
          { h: "6. Your Rights", p: "Depending on your location, you may have rights including access to your data, correction of inaccurate data, deletion of your data, portability of your data, and objection to processing. To exercise these rights, contact privacy@zelvarix.ai. We will respond within 30 days." },
          { h: "7. Security", p: "We implement industry-standard security measures including encryption in transit (TLS 1.3), encryption at rest, row-level security in our database, API key isolation, and regular security audits. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security." },
          { h: "8. Cookies", p: "We use essential cookies for authentication and session management. We also use analytics cookies (Google Analytics) to understand how users interact with our platform. You can control cookies through your browser settings. Disabling essential cookies may affect platform functionality." },
          { h: "9. Changes to This Policy", p: "We may update this Privacy Policy from time to time. We will notify you of significant changes by email and by posting the new policy on this page with an updated effective date." },
          { h: "10. Contact Us", p: "If you have questions about this Privacy Policy, please contact us at privacy@zelvarix.ai or write to Zelvarix, Inc., [Your Address]." },
        ]
      },
      terms: {
        title: "Terms of Service",
        lastUpdated: "June 1, 2026",
        content: [
          { h: "1. Acceptance of Terms", p: "By accessing or using Zelvarix (zelvarix.ai), you agree to be bound by these Terms of Service. If you do not agree, do not use the platform. These terms apply to all users including individuals, teams, and organisations." },
          { h: "2. Description of Service", p: "Zelvarix is a B2B prospecting platform that provides access to professional contact data, AI-powered lead intelligence, and sales tools. We reserve the right to modify, suspend, or discontinue any feature at any time with reasonable notice." },
          { h: "3. Acceptable Use", p: "You may use Zelvarix only for lawful B2B prospecting and sales purposes. You may not use the platform to spam, harass, or contact individuals outside a professional B2B context, violate any applicable law including CAN-SPAM, GDPR, or CASL, resell or redistribute contact data, attempt to reverse-engineer or scrape the platform, or share your account credentials with others." },
          { h: "4. Subscription and Billing", p: "Zelvarix operates on a subscription basis. Your subscription begins on the date you select a paid plan and provide payment information. Subscriptions automatically renew unless cancelled before the renewal date. Credits expire at the end of each billing period and do not roll over unless stated otherwise." },
          { h: "5. Cancellation and Refunds", p: "You may cancel your subscription at any time through the Billing section of your account. Cancellation takes effect at the end of your current billing period. We do not offer refunds for partial billing periods. In exceptional circumstances, refund requests may be considered at our discretion — contact support@zelvarix.ai." },
          { h: "6. Intellectual Property", p: "Zelvarix and all associated trademarks, logos, and content are the property of Zelvarix, Inc. Contact data provided through the platform is licensed from third-party data providers and may not be redistributed, resold, or used outside the platform's intended purpose." },
          { h: "7. Disclaimers", p: "Zelvarix is provided 'as is' without warranties of any kind. We do not guarantee the accuracy, completeness, or availability of contact data. AI-generated content (ice breakers, emails, scores) is provided for informational purposes and should be reviewed before use. We are not responsible for the outcome of any outreach campaigns." },
          { h: "8. Limitation of Liability", p: "To the maximum extent permitted by law, Zelvarix's liability to you for any claim arising from these terms or your use of the platform is limited to the amount you paid us in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages." },
          { h: "9. Governing Law", p: "These terms are governed by the laws of the State of Texas, United States. Any disputes shall be resolved in the courts of Texas, and you consent to personal jurisdiction in those courts." },
          { h: "10. Changes to Terms", p: "We may update these terms from time to time. We will notify you of material changes by email at least 14 days before they take effect. Continued use of the platform after changes take effect constitutes acceptance of the new terms." },
        ]
      },
      cookies: {
        title: "Cookie Policy",
        lastUpdated: "June 1, 2026",
        content: [
          { h: "What Are Cookies", p: "Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and understand how you use the site." },
          { h: "Essential Cookies", p: "These cookies are required for Zelvarix to function. They manage your authentication session and keep you logged in. Without these cookies, you cannot use the platform. These cannot be disabled." },
          { h: "Analytics Cookies", p: "We use Google Analytics (GA4) to understand how users interact with Zelvarix — which features are used most, where users spend time, and how we can improve. Analytics cookies are anonymous and do not identify you personally. You can opt out via your browser settings or the Google Analytics opt-out extension." },
          { h: "Support Cookies", p: "We use Crisp chat to provide customer support. Crisp may set cookies to maintain your chat session and remember your conversation history. These are only active if you interact with the chat widget." },
          { h: "Managing Cookies", p: "You can control cookies through your browser settings. Most browsers allow you to block or delete cookies. Note that blocking essential cookies will prevent you from using Zelvarix. To opt out of Google Analytics specifically, visit tools.google.com/dlpage/gaoptout." },
          { h: "Contact", p: "For questions about our use of cookies, contact privacy@zelvarix.ai." },
        ]
      },
      contact: {
        title: "Contact Us",
        lastUpdated: null,
        isContact: true,
      },
      about: {
        title: "About Zelvarix",
        lastUpdated: null,
        isAbout: true,
      },
      security: {
        title: "Security",
        lastUpdated: "June 1, 2026",
        content: [
          { h: "Our Commitment to Security", p: "Security is foundational to Zelvarix. We are committed to protecting your data and the data of your prospects. We continuously review and improve our security practices." },
          { h: "Infrastructure Security", p: "Zelvarix is hosted on Vercel's global edge network with automatic DDoS protection. Our database runs on Supabase (Postgres) with enterprise-grade encryption. All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption." },
          { h: "Authentication & Access Control", p: "User authentication is managed by Supabase Auth with industry-standard JWT tokens. We implement row-level security (RLS) ensuring users can only access their own data. API keys are never exposed in client-side code — all third-party API calls are proxied through secure server-side functions." },
          { h: "Data Isolation", p: "Each team's data is completely isolated using row-level security policies. It is architecturally impossible for one team to access another team's contacts, lists, or billing data." },
          { h: "Session Security", p: "User sessions automatically expire after 15 minutes of inactivity. Sessions are invalidated immediately on sign-out. We support re-authentication for sensitive actions like account cancellation." },
          { h: "API Security", p: "All API endpoints implement rate limiting to prevent abuse. Server-side proxy functions protect third-party API keys from exposure. Input validation is performed on all API endpoints." },
          { h: "Vulnerability Reporting", p: "If you discover a security vulnerability in Zelvarix, please report it responsibly to security@zelvarix.ai. We will acknowledge your report within 24 hours and work to resolve confirmed vulnerabilities promptly. We appreciate responsible disclosure and will credit researchers where appropriate." },
          { h: "Compliance", p: "Zelvarix is designed with GDPR and CCPA compliance in mind. We maintain data processing agreements with all sub-processors. Enterprise customers may request our Data Processing Agreement (DPA) by contacting sales@zelvarix.ai." },
        ]
      },
    };

    const page = pages[appView];

    async function submitContactLegal() { await submitContact(); }

    return (
      <div style={{ minHeight:"100vh", background:T.cream, fontFamily:"'DM Sans',sans-serif", color:T.ink }}>
        <style>{GLOBAL_CSS}</style>
        {/* Nav */}
        <nav style={{ height:56, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", padding:"0 40px", justifyContent:"space-between", background:"#fff", position:"sticky", top:0, zIndex:50 }}>
          <button onClick={()=>setAppView(currentUser?"app":"pricing")} style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:T.ink, background:"none", border:"none", cursor:"pointer", letterSpacing:-.3 }}>
            Zelvarix<span style={{ color:T.green, fontStyle:"italic", fontSize:"0.85em" }}>.ai</span>
          </button>
          <div style={{ display:"flex", gap:20, alignItems:"center" }}>
            {["about","security","contact"].map(p=>(
              <button key={p} onClick={()=>setAppView(p)} style={{ fontSize:13, color:appView===p?T.green:T.inkm, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textTransform:"capitalize", fontWeight:appView===p?600:400 }}>{p}</button>
            ))}
            <button onClick={()=>setAppView(currentUser?"app":"pricing")} style={{ padding:"7px 16px", background:T.ink, border:"none", borderRadius:4, color:T.cream, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{currentUser?"Back to app →":"Get started →"}</button>
          </div>
        </nav>

        <div style={{ maxWidth:760, margin:"0 auto", padding:"52px 24px 80px" }}>

          {/* CONTACT PAGE */}
          {appView==="contact" && (
            <>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:42, color:T.ink, letterSpacing:-1, marginBottom:8 }}>Get in touch</div>
              <div style={{ fontSize:15, color:T.inkm, marginBottom:40, lineHeight:1.7 }}>Have a question, need help, or want to talk about an enterprise plan? We're here.</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, marginBottom:40 }}>
                {[
                  { icon:"✉", label:"General", email:"hello@zelvarix.ai", desc:"General questions and feedback" },
                  { icon:"🛠", label:"Support", email:"support@zelvarix.ai", desc:"Technical help and account issues" },
                  { icon:"💼", label:"Sales", email:"sales@zelvarix.ai", desc:"Enterprise plans and partnerships" },
                  { icon:"🔒", label:"Security", email:"security@zelvarix.ai", desc:"Report vulnerabilities responsibly" },
                ].map(c=>(
                  <div key={c.label} style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, padding:"18px 20px" }}>
                    <div style={{ fontSize:20, marginBottom:8 }}>{c.icon}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:2 }}>{c.label}</div>
                    <div style={{ fontSize:13, color:T.inkm, marginBottom:6 }}>{c.desc}</div>
                    <a href={`mailto:${c.email}`} style={{ fontSize:13, color:T.green, textDecoration:"none", fontWeight:500 }}>{c.email}</a>
                  </div>
                ))}
              </div>
              {/* Contact form */}
              <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, padding:"28px 28px" }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:T.ink, marginBottom:20 }}>Send us a message</div>
                {contactSent ? (
                  <div style={{ textAlign:"center", padding:"32px 0" }}>
                    <div style={{ fontSize:36, marginBottom:12 }}>✓</div>
                    <div style={{ fontSize:18, fontFamily:"'Instrument Serif',serif", color:T.ink, marginBottom:6 }}>Message sent!</div>
                    <div style={{ fontSize:13, color:T.inkm }}>We'll get back to you within 1 business day.</div>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                      <div>
                        <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Name *</label>
                        <input className="input-base" value={contactForm.name} onChange={e=>setContactForm(p=>({...p,name:e.target.value}))} placeholder="Your name" />
                      </div>
                      <div>
                        <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Email *</label>
                        <input className="input-base" type="email" value={contactForm.email} onChange={e=>setContactForm(p=>({...p,email:e.target.value}))} placeholder="you@company.com" />
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                      <div>
                        <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Company</label>
                        <input className="input-base" value={contactForm.company} onChange={e=>setContactForm(p=>({...p,company:e.target.value}))} placeholder="Company name" />
                      </div>
                      <div>
                        <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Subject</label>
                        <select className="input-base" value={contactForm.subject} onChange={e=>setContactForm(p=>({...p,subject:e.target.value}))}>
                          {["General inquiry","Technical support","Billing question","Enterprise sales","Partnership","Security","Other"].map(s=><option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Message *</label>
                      <textarea className="input-base" value={contactForm.message} onChange={e=>setContactForm(p=>({...p,message:e.target.value}))} placeholder="Tell us how we can help..." rows={5} style={{ resize:"vertical", lineHeight:1.6 }} />
                    </div>
                    {contactError && <div style={{ fontSize:12, color:T.red, background:T.redl, border:`1px solid ${T.redb}`, borderRadius:4, padding:"8px 12px" }}>{contactError}</div>}
                    <button onClick={submitContact} disabled={contactSending} style={{ padding:"11px", background:T.green, border:"none", borderRadius:4, color:"#fff", fontWeight:600, fontSize:14, cursor:contactSending?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", opacity:contactSending?.7:1 }}>
                      {contactSending ? "Sending…" : "Send message →"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ABOUT PAGE */}
          {appView==="about" && (
            <>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:42, color:T.ink, letterSpacing:-1, marginBottom:8 }}>About Zelvarix</div>
              <div style={{ fontSize:15, color:T.inkm, marginBottom:40, lineHeight:1.7 }}>We're building the AI-native prospecting platform for modern sales teams.</div>
              <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
                {[
                  { title:"Our mission", body:"Sales teams spend too much time finding contacts and not enough time selling. Zelvarix changes that — combining 1.3B+ verified contacts with Claude AI to give every rep the intelligence they need to find, research, and approach the right people fast." },
                  { title:"Why we built this", body:"Every existing prospecting tool was built for the pre-AI era. They're data dumps. Zelvarix is different — it doesn't just find contacts, it tells you exactly how to approach them with personalised ice breakers, lead score rationales, and AI-written outreach. We built the tool we always wanted." },
                  { title:"Our values", body:"Transparency over opacity — our AI scoring always explains its reasoning. Privacy by design — we handle contact data responsibly and only for legitimate B2B purposes. Fair pricing — we charge what we cost, not what the market will bear." },
                  { title:"Get in touch", body:"We're a small, focused team. If you have feedback, ideas, or want to talk enterprise — we'd love to hear from you. Email us at hello@zelvarix.ai or use the contact form." },
                ].map(s=>(
                  <div key={s.title} style={{ borderTop:`2px solid ${T.green}`, paddingTop:20 }}>
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:T.ink, marginBottom:10 }}>{s.title}</div>
                    <div style={{ fontSize:14, color:T.inkm, lineHeight:1.8 }}>{s.body}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* LEGAL PAGES (Privacy, Terms, Cookies, Security) */}
          {!["contact","about"].includes(appView) && page && (
            <>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:42, color:T.ink, letterSpacing:-1, marginBottom:8 }}>{page.title}</div>
              {page.lastUpdated && <div style={{ fontSize:13, color:T.inkmut, marginBottom:40 }}>Last updated: {page.lastUpdated}</div>}
              <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
                {(page.content || []).map((section, i)=>(
                  <div key={i} style={{ borderTop:`1px solid ${T.border}`, paddingTop:20 }}>
                    <div style={{ fontSize:15, fontWeight:600, color:T.ink, marginBottom:8 }}>{section.h}</div>
                    <div style={{ fontSize:14, color:T.inkm, lineHeight:1.8 }}>{section.p}</div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <footer style={{ background:T.ink, padding:"32px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:T.cream }}>Zelvarix<span style={{ color:T.greenb, fontStyle:"italic", fontSize:"0.85em" }}>.ai</span></div>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            {[["privacy","Privacy"],["terms","Terms"],["cookies","Cookies"],["security","Security"],["contact","Contact"],["about","About"]].map(([id,label])=>(
              <button key={id} onClick={()=>setAppView(id)} style={{ fontSize:12, color:T.inkm, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{label}</button>
            ))}
          </div>
          <div style={{ fontSize:11, color:T.inkm }}>© 2026 Zelvarix.ai</div>
        </footer>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPLASH
  // ══════════════════════════════════════════════════════════════════════════
  if (appView==="splash") return (
    <div style={{ minHeight:"100vh", background:T.ink, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", position:"relative", overflow:"hidden" }}>
      <style>{GLOBAL_CSS}</style>
      {/* Grain texture overlay */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='.04'/%3E%3C/svg%3E\")", opacity:.6, pointerEvents:"none" }} />
      {/* Large serif wordmark */}
      <div style={{ animation:"fadeIn .8s ease", textAlign:"center", zIndex:1 }}>
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:64, color:T.cream, letterSpacing:-2, lineHeight:1, marginBottom:6 }}>Zelvarix<span style={{ color:T.greenb, fontStyle:"italic", fontSize:"0.85em" }}>.ai</span></div>
        <div style={{ fontSize:13, color:T.inkm, letterSpacing:2, textTransform:"uppercase", marginBottom:52 }}>Sales Intelligence Platform</div>
        {/* Loading bar */}
        <div style={{ width:200, height:2, background:"rgba(255,255,255,.1)", borderRadius:1, margin:"0 auto 14px", overflow:"hidden" }}>
          <div style={{ height:"100%", background:T.greenb, borderRadius:1, width: splashDone?"100%":"0", animation:splashDone?"none":"barFill 2s ease forwards" }} />
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,.2)", letterSpacing:2, textTransform:"uppercase" }}>{splashDone?"Ready":"Initialising"}</div>
      </div>
      <div style={{ position:"absolute", bottom:24, fontSize:11, color:"rgba(255,255,255,.15)", letterSpacing:1 }}>© 2026 Zelvarix.ai · Powered by Claude AI</div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ══════════════════════════════════════════════════════════════════════════
  if (appView==="auth") {
    const isLogin = authMode==="login";
    return (
      <div style={{ minHeight:"100vh", background:T.cream, display:"flex", fontFamily:"'DM Sans',sans-serif" }}>
        <style>{GLOBAL_CSS}</style>
        {/* Left — branding panel */}
        <div style={{ width:"42%", background:T.ink, padding:"52px 56px", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", bottom:-120, right:-80, width:400, height:400, borderRadius:"50%", background:"rgba(255,255,255,.02)", pointerEvents:"none" }} />
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:30, color:T.cream, letterSpacing:-.5 }}>Zelvarix<span style={{ color:T.greenb, fontStyle:"italic", fontSize:"0.85em" }}>.ai</span></div>
          <div>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:40, color:T.cream, lineHeight:1.15, letterSpacing:-.8, marginBottom:20 }}>Find your next best customer <span style={{ color:T.greenb, fontStyle:"italic" }}>with AI.</span></div>
            <div style={{ fontSize:14, color:T.inkm, lineHeight:1.8, marginBottom:36 }}>Zelvarix combines 1.3B+ verified contacts with Claude AI to give your team the intelligence edge.</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:36 }}>
              {[["1.3B+","Verified Contacts"],["121M+","Companies"],["95%","Data Accuracy"],["60s","Time to First Lead"]].map(([v,l])=>(
                <div key={l} style={{ borderTop:`1px solid rgba(255,255,255,.1)`, paddingTop:12 }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:26, color:T.cream, marginBottom:2 }}>{v}</div>
                  <div style={{ fontSize:11, color:T.inkm, letterSpacing:.3 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop:`1px solid rgba(255,255,255,.08)`, paddingTop:20 }}>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", lineHeight:1.7, fontStyle:"italic", marginBottom:12 }}>"Zelvarix cut our prospecting time by 70%."</div>
              <div style={{ fontSize:12, color:T.inkm }}>Jamie Morrison, VP of Sales · TechCorp</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.15)", letterSpacing:.5 }}>Trusted by 12,000+ sales teams</div>
            <button onClick={()=>setAppView("pricing")} style={{ fontSize:12, color:T.greenb, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textDecoration:"underline" }}>View pricing →</button>
          </div>
        </div>

        {/* Right — form */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:48 }}>
          <div style={{ width:"100%", maxWidth:400, animation:"fadeIn .4s ease" }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:30, color:T.ink, marginBottom:6, letterSpacing:-.5 }}>{isLogin?"Welcome back":"Create account"}</div>
            <div style={{ fontSize:13, color:T.inkm, marginBottom:28 }}>{isLogin?"Sign in to your workspace":"Start your 7-day free trial. No card required."}</div>

            {/* Social */}
            <div style={{ display:"flex", gap:10, marginBottom:20 }}>
              {[["Continue with Google","google"],["Continue with LinkedIn","linkedin_oidc"]].map(([l,p])=>(
                <button key={l} className="btn-ghost" onClick={()=>sb.auth.signInWithOAuth({ provider:p, options:{ redirectTo: window.location.origin } })} style={{ flex:1, padding:"9px 12px", background:"#fff", border:`1px solid ${T.border}`, borderRadius:4, fontSize:12, fontWeight:500, color:T.inkl, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .15s" }}>{l}</button>
              ))}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:T.border }} />
              <span style={{ fontSize:11, color:T.inkmut }}>or email</span>
              <div style={{ flex:1, height:1, background:T.border }} />
            </div>

            {/* Fields */}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {!isLogin && (
                <div>
                  <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Full name</label>
                  <input className="input-base" value={signupData.name} onChange={e=>setSignupData(p=>({...p,name:e.target.value}))} placeholder="Jane Smith" />
                </div>
              )}
              <div>
                <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Work email</label>
                <input className="input-base" type="email" value={isLogin?loginData.email:signupData.email} onChange={e=>isLogin?setLoginData(p=>({...p,email:e.target.value})):setSignupData(p=>({...p,email:e.target.value}))} placeholder="you@company.com" />
              </div>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <label style={{ fontSize:12, fontWeight:500, color:T.inkl }}>Password</label>
                  {isLogin && <button style={{ fontSize:12, color:T.green, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Forgot?</button>}
                </div>
                <input className="input-base" type="password" value={isLogin?loginData.password:signupData.password} onChange={e=>isLogin?setLoginData(p=>({...p,password:e.target.value})):setSignupData(p=>({...p,password:e.target.value}))} placeholder={isLogin?"Password":"Min. 8 characters"} onKeyDown={e=>e.key==="Enter"&&(isLogin?handleLogin():null)} />
              </div>
              {!isLogin && (
                <div>
                  <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Confirm password</label>
                  <input className="input-base" type="password" value={signupData.confirm} onChange={e=>setSignupData(p=>({...p,confirm:e.target.value}))} placeholder="Re-enter password" onKeyDown={e=>e.key==="Enter"&&handleSignup()} />
                </div>
              )}
              {!isLogin && (
                <label style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:12, color:T.inkm, cursor:"pointer", lineHeight:1.6 }}>
                  <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} style={{ marginTop:2, cursor:"pointer", flexShrink:0 }} />
                  <span>
                    I agree to the{" "}
                    <button type="button" onClick={(e)=>{e.preventDefault(); setAppView("terms");}} style={{ color:T.green, fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:12, padding:0, textDecoration:"underline" }}>Terms of Service</button>
                    {" "}and{" "}
                    <button type="button" onClick={(e)=>{e.preventDefault(); setAppView("privacy");}} style={{ color:T.green, fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:12, padding:0, textDecoration:"underline" }}>Privacy Policy</button>
                  </span>
                </label>
              )}
              {authError && <div style={{ fontSize:12, color:T.red, background:T.redl, border:`1px solid ${T.redb}`, borderRadius:4, padding:"8px 12px" }}>⚠ {authError}</div>}
              <button onClick={isLogin?handleLogin:handleSignup} disabled={authLoading || (!isLogin && !termsAccepted)} style={{ padding:"11px", background:T.green, border:"none", borderRadius:4, color:"#fff", fontWeight:600, fontSize:14, cursor:(authLoading || (!isLogin && !termsAccepted))?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:(authLoading || (!isLogin && !termsAccepted))?.5:1, marginTop:4 }}>
                {authLoading ? <><Spinner />{isLogin?"Signing in…":"Creating account…"}</> : isLogin?"Sign in →":"Create account →"}
              </button>
            </div>

            <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:T.inkm }}>
              {isLogin?"No account? ":"Have an account? "}
              <button onClick={()=>{setAuthMode(isLogin?"signup":"login");setAuthError("");}} style={{ color:T.green, fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
                {isLogin?"Sign up free":"Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ONBOARDING
  // ══════════════════════════════════════════════════════════════════════════
  if (appView==="onboard") {
    const step = onboardSteps[onboardStep];
    return (
      <div style={{ minHeight:"100vh", background:T.cream, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ width:480, animation:"fadeIn .4s ease" }}>
          <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:28, color:T.ink, marginBottom:6, letterSpacing:-.3 }}>Zelvarix<span style={{ color:T.green, fontStyle:"italic", fontSize:"0.85em" }}>.ai</span></div>
          <div style={{ fontSize:12, color:T.inkmut, marginBottom:36 }}>Let's get you set up</div>
          {/* Progress */}
          <div style={{ display:"flex", gap:4, marginBottom:36 }}>
            {onboardSteps.map((_,i)=>(
              <div key={i} style={{ flex:1, height:2, borderRadius:1, background:i<=onboardStep?T.green:T.paperd, transition:"background .3s" }} />
            ))}
          </div>
          <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, padding:"32px 32px 28px", boxShadow:`0 2px 16px ${T.shadow}` }}>
            <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:24, color:T.ink, marginBottom:6, letterSpacing:-.3 }}>{step.title}</div>
            {step.sub && <div style={{ fontSize:13, color:T.inkm, marginBottom:22 }}>{step.sub}</div>}
            {step.field && (
              <input autoFocus className="input-base" value={onboardData[step.field]} onChange={e=>setOnboardData(p=>({...p,[step.field]:e.target.value}))} placeholder={step.placeholder} onKeyDown={e=>e.key==="Enter"&&(onboardStep<onboardSteps.length-1?setOnboardStep(s=>s+1):setAppView("app"))} style={{ marginBottom:20 }} />
            )}
            <button onClick={async()=>{ if(onboardStep<onboardSteps.length-1){ setOnboardStep(s=>s+1); } else { try { if(currentUser){ await sb.from("profiles").upsert({ id:currentUser.id, name:onboardData.name, company:onboardData.company, role:onboardData.role, goal:onboardData.goal }); } } catch(e){ console.warn("Profile save error:", e); } setAppView("app"); } }} style={{ width:"100%", padding:"11px", background:T.ink, border:"none", borderRadius:4, color:T.cream, fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              {onboardStep===0?"Get started →":onboardStep<onboardSteps.length-1?"Continue →":"Launch Zelvarix →"}
            </button>
            {onboardStep>0 && <button onClick={()=>setOnboardStep(s=>s-1)} style={{ width:"100%", marginTop:8, padding:"8px", background:"none", border:"none", color:T.inkmut, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>← Back</button>}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN APP — top-bar navigation + full-bleed content
  // ══════════════════════════════════════════════════════════════════════════
  const navItems = [
    { id:"discover",  label:"Discover" },
    { id:"pipeline",  label:"Pipeline" },
    { id:"lists",     label:"Lists" },
    ...(perms.canViewTeam     ? [{ id:"team",    label:"Team"    }] : []),
    ...(perms.canManageBilling? [{ id:"billing", label:"Billing" }] : []),
    { id:"settings", label:"Settings" },
  ];

  const selectStyle = { padding:"7px 10px", background:"#fff", border:`1px solid ${T.border}`, borderRadius:4, color:T.inkl, fontSize:12, fontFamily:"'DM Sans',sans-serif", outline:"none", cursor:"pointer", width:"100%", appearance:"none" };

  return (
    <div style={{ minHeight:"100vh", background:T.cream, fontFamily:"'DM Sans',sans-serif", color:T.ink }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── TOP NAV BAR ─────────────────────────────────────────────────── */}
      <div style={{ height:52, background:"#fff", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", padding:"0 24px", gap:0, position:"sticky", top:0, zIndex:50, boxShadow:`0 1px 4px ${T.shadow}` }}>
        {/* Wordmark */}
        <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:T.ink, marginRight:32, letterSpacing:-.3, flexShrink:0 }}>Zelvarix<span style={{ color:T.green, fontStyle:"italic", fontSize:"0.85em" }}>.ai</span></div>

        {/* Nav links */}
        <div style={{ display:"flex", gap:0, flex:1 }}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{ padding:"0 16px", height:52, background:"none", border:"none", borderBottom:`2px solid ${view===n.id?T.green:"transparent"}`, color:view===n.id?T.green:T.inkm, fontWeight:view===n.id?600:400, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .15s", whiteSpace:"nowrap" }}>{n.label}</button>
          ))}
        </div>

        {/* Right — credits + user */}
        <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
          <div style={{ fontSize:12, color:T.inkm }}>
            <span style={{ fontFamily:"'DM Mono',monospace", color:T.green, fontWeight:500 }}>{activeBilling.credits.total - activeBilling.credits.used}</span>
            <span style={{ color:T.inkmut }}> credits</span>
          </div>
          {/* User menu */}
          <div style={{ position:"relative" }}>
            <button onClick={()=>setShowUserMenu(s=>!s)} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", background:T.paper, border:`1px solid ${T.border}`, borderRadius:4, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              <div style={{ width:24, height:24, borderRadius:3, background:T.greenl, border:`1px solid ${T.greenb}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:T.green }}>{displayAvatar}</div>
              <span style={{ fontSize:12, fontWeight:500, color:T.inkl }}>{displayName}</span>
              <span style={{ fontSize:10, color:T.inkmut }}>{showUserMenu?"▲":"▼"}</span>
            </button>
            {showUserMenu && (
              <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, width:240, background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, boxShadow:`0 4px 20px ${T.shadowd}`, zIndex:100, overflow:"hidden" }}>
                {teamMembers.filter(m=>m.status==="active").length > 1 && (
                  <div style={{ padding:"10px 14px 6px", fontSize:10, fontWeight:600, color:T.inkmut, textTransform:"uppercase", letterSpacing:1 }}>Switch user</div>
                )}
                {teamMembers.filter(m=>m.status==="active").length > 1 && teamMembers.filter(m=>m.status==="active").map(m=>{
                  const rp = ROLE_PERMISSIONS[m.role];
                  return (
                    <button key={m.id} onClick={()=>{ setActiveUserId(m.id); setShowUserMenu(false); if(view==="team"&&!ROLE_PERMISSIONS[m.role].canViewTeam)setView("discover"); if(view==="billing"&&!ROLE_PERMISSIONS[m.role].canManageBilling)setView("discover"); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"8px 14px", background:m.id===activeUserId?"#f8faf8":"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textAlign:"left" }}>
                      <div style={{ width:26, height:26, borderRadius:3, background:rp.bg, border:`1px solid ${rp.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:rp.color, flexShrink:0 }}>{m.avatar}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:T.ink }}>{m.name}</div>
                        <RoleBadge role={m.role} />
                      </div>
                      {m.id===activeUserId && <span style={{ color:T.green, fontSize:12 }}>✓</span>}
                    </button>
                  );
                })}
                
                <div style={{ borderTop:`1px solid ${T.border}`, padding:"8px 14px" }}>
                  <div style={{ padding:"8px 14px 6px", borderTop:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink, marginBottom:2 }}>{displayName}</div>
                  <div style={{ fontSize:11, color:T.inkm, marginBottom:10 }}>{displayEmail}</div>
                  <button onClick={async()=>{ await sb.auth.signOut(); setCurrentUser(null); setSbTeam(null); setAppView("auth"); setShowUserMenu(false); }} style={{ fontSize:12, color:T.red, background:T.redl, border:`1px solid ${T.redb}`, borderRadius:4, padding:"6px 12px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:6, width:"100%", justifyContent:"center", fontWeight:500 }}>⏏ Sign out</button>
                </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", minHeight:"calc(100vh - 52px)" }}>

        {/* ── DISCOVER ────────────────────────────────────────────────── */}
        {view==="discover" && (
          <div style={{ flex:1, display:"flex", overflow:"hidden", height:"calc(100vh - 52px)" }}>

            {/* Filter sidebar */}
            <div style={{ width:220, background:"#fff", borderRight:`1px solid ${T.border}`, padding:"20px 16px", overflowY:"auto", flexShrink:0 }}>
              <div style={{ fontSize:10, fontWeight:600, color:T.inkmut, textTransform:"uppercase", letterSpacing:1.5, marginBottom:16 }}>Filter</div>

              {/* Search */}
              <div style={{ marginBottom:16 }}>
                <input className="input-base" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search name, company…" style={{ fontSize:12, padding:"7px 10px" }} />
              </div>

              {[
                { label:"Industry", jsx: (
                  <NaicsIndustrySearch
                    value={filters.naicsCode}
                    onChange={item=>setFilters(p=>({...p, naicsCode:item, industry:"All Industries"}))}
                  />
                )},
                { label:"Company Size", jsx: (
                  <select style={selectStyle} value={filters.size} onChange={e=>setFilters(p=>({...p,size:e.target.value}))}>
                    {COMPANY_SIZES.map(o=><option key={o}>{o}</option>)}
                  </select>
                )},
                { label:"Seniority", jsx: (
                  <select style={selectStyle} value={filters.seniority} onChange={e=>setFilters(p=>({...p,seniority:e.target.value}))}>
                    {SENIORITY.map(o=><option key={o}>{o}</option>)}
                  </select>
                )},
                { label:"Department", jsx: (
                  <select style={selectStyle} value={filters.department} onChange={e=>setFilters(p=>({...p,department:e.target.value}))}>
                    {DEPARTMENTS.map(o=><option key={o}>{o}</option>)}
                  </select>
                )},
                { label:"Revenue", jsx: (
                  <select style={selectStyle} value={filters.revenue} onChange={e=>setFilters(p=>({...p,revenue:e.target.value}))}>
                    {REVENUES.map(o=><option key={o}>{o}</option>)}
                  </select>
                )},
                { label:"State", jsx: (
                  <select style={selectStyle} value={filters.state} onChange={e=>setFilters(p=>({...p,state:e.target.value}))}>
                    {US_STATES.map(o=><option key={o}>{o}</option>)}
                  </select>
                )},
                { label:"City", jsx: (
                  <input className="input-base" value={filters.city} onChange={e=>setFilters(p=>({...p,city:e.target.value}))} placeholder="e.g. Houston" style={{ fontSize:12, padding:"7px 10px" }} />
                )},
              ].map(f=>(
                <div key={f.label} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:500, color:T.inkl, marginBottom:5 }}>{f.label}</div>
                  {f.jsx}
                </div>
              ))}

              <button onClick={()=>{ setSearchQuery(""); setFilters({ industry:"All Industries", naicsCode:null, size:"Any Size", seniority:"Any Seniority", department:"Any Department", revenue:"Any Revenue", state:"Any State", city:"" }); }} style={{ fontSize:11, color:T.inkmut, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textDecoration:"underline", marginTop:4 }}>Reset</button>
            </div>

            {/* Results table */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

              {/* Toolbar */}
              <div style={{ padding:"10px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fff", flexShrink:0, gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <button onClick={()=>{ const next=!useLiveData; setUseLiveData(next); if(next) runPDLSearch(1,false); }} style={{ fontSize:11, fontWeight:600, padding:"4px 10px", border:`1px solid ${useLiveData?T.green:T.border}`, borderRadius:3, background:useLiveData?T.greenl:"#fff", color:useLiveData?T.green:T.inkm, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:useLiveData?T.green:T.inkmut, display:"inline-block", animation:useLiveData&&pdlLoading?"pulse 1s infinite":"none" }} />
                    {useLiveData ? "Live Data" : "Sample Data"}
                  </button>
                  {pdlError && <span style={{ fontSize:11, color:T.amber }}>{pdlError}</span>}
                  <span style={{ fontSize:13, color:T.inkm }}><span style={{ fontFamily:"'DM Mono',monospace", color:T.green, fontWeight:500 }}>{useLiveData ? displayTotal.toLocaleString() : sorted.length}</span> {useLiveData ? "live contacts" : `of ${MOCK_CONTACTS.length} samples`}</span>
                  <button onClick={()=>{ setSelectMode(s=>!s); setSelectedForExport(new Set()); }} style={{ fontSize:11, fontWeight:500, padding:"4px 10px", border:`1px solid ${selectMode?T.green:T.border}`, borderRadius:3, background:selectMode?T.greenl:"#fff", color:selectMode?T.green:T.inkm, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .15s" }}>
                    {selectMode?"✓ Selecting":"Select"}
                  </button>
                  {selectMode && (
                    <button onClick={()=>{ const allIds=new Set(sorted.map(c=>c.id)); const all=sorted.every(c=>selectedForExport.has(c.id)); setSelectedForExport(all?new Set():allIds); }} style={{ fontSize:11, padding:"4px 10px", border:`1px solid ${T.border}`, borderRadius:3, background:"#fff", color:T.inkm, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                      {sorted.every(c=>selectedForExport.has(c.id))?"Deselect all":"Select all"}
                    </button>
                  )}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {selectMode && selectedForExport.size>0 && (
                    <button onClick={()=>downloadCSV(sorted.filter(c=>selectedForExport.has(c.id)))} style={{ fontSize:12, fontWeight:500, padding:"5px 12px", border:`1px solid ${T.greenb}`, borderRadius:3, background:T.greenl, color:T.green, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>↓ Selected ({selectedForExport.size})</button>
                  )}
                  {selectMode && selectedForExport.size>0 && (
                    <button onClick={()=>{
                      const selected = sorted.filter(c=>selectedForExport.has(c.id));
                      setBulkEmailContacts(selected);
                      setBulkEmailResults({});
                      setShowBulkEmail(true);
                    }} style={{ fontSize:12, fontWeight:600, padding:"5px 12px", border:`1px solid ${T.greenb}`, borderRadius:3, background:T.green, color:"#fff", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>✦ Generate emails ({selectedForExport.size})</button>
                  )}
                  {!perms.canExport
                    ? <span style={{ fontSize:11, color:T.amber, background:T.amberl, border:`1px solid ${T.amberb}`, borderRadius:3, padding:"5px 10px" }}>🔒 Viewer — no export</span>
                    : <button onClick={()=>downloadCSV(sorted)} style={{ fontSize:12, fontWeight:500, padding:"5px 12px", border:`1px solid ${T.border}`, borderRadius:3, background:"#fff", color:T.inkl, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>↓ Export CSV</button>
                  }
                </div>
              </div>

              {/* Table header */}
              <div style={{ display:"grid", gridTemplateColumns:`${selectMode?"28px ":""}2.2fr 1.4fr 1fr 0.7fr 0.7fr 80px 60px`, padding:"7px 20px", borderBottom:`1px solid ${T.border}`, background:T.paper, flexShrink:0 }}>
                {[...(selectMode?[""]:[]), "Name","Company","Industry","Location","Seniority","Score",""].map((h,i)=>(
                  <div key={i} style={{ fontSize:10, fontWeight:600, color:T.inkmut, textTransform:"uppercase", letterSpacing:.8 }}>{h}</div>
                ))}
              </div>

              {/* Table rows */}
              <div style={{ flex:1, overflowY:"auto" }}>
                {pdlLoading && useLiveData && pdlContacts.length===0 ? (
                  <div style={{ textAlign:"center", padding:"60px 20px" }}>
                    <div style={{ width:32, height:32, border:`3px solid ${T.paperd}`, borderTopColor:T.green, borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto 14px" }} />
                    <div style={{ fontSize:13, color:T.inkm }}>Searching live contacts…</div>
                  </div>
                ) : sorted.length===0 ? (
                  <div style={{ textAlign:"center", padding:"60px 20px" }}>
                    <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:T.inkm, marginBottom:8 }}>No results found</div>
                    <div style={{ fontSize:13, color:T.inkmut, marginBottom:16 }}>Try adjusting your filters or search term.</div>
                    <button onClick={()=>{ setSearchQuery(""); setFilters({ industry:"All Industries", naicsCode:null, size:"Any Size", seniority:"Any Seniority", department:"Any Department", revenue:"Any Revenue", state:"Any State", city:"" }); }} style={{ fontSize:12, padding:"7px 16px", background:T.ink, border:"none", borderRadius:3, color:T.cream, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Clear filters</button>
                  </div>
                ) : (
                  <>{sorted.map(c=>(
                    <div key={c.id} className="row-hover" onClick={()=>setSelectedContact(selectedContact?.id===c.id?null:c)} style={{ display:"grid", gridTemplateColumns:`${selectMode?"28px ":""}2.2fr 1.4fr 1fr 0.7fr 0.7fr 80px 60px`, padding:"9px 20px", borderBottom:`1px solid ${T.border}`, alignItems:"center", cursor:"pointer", background:selectedContact?.id===c.id?T.greenl:"#fff", transition:"background .1s" }}>
                      {selectMode && (
                        <div onClick={e=>{e.stopPropagation();toggleExport(c.id);}} style={{ width:16, height:16, borderRadius:3, border:`1.5px solid ${selectedForExport.has(c.id)?T.green:T.borderd}`, background:selectedForExport.has(c.id)?T.green:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .1s" }}>
                          {selectedForExport.has(c.id) && <span style={{ color:"#fff", fontSize:10, lineHeight:1 }}>✓</span>}
                        </div>
                      )}
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                          <span style={{ fontSize:13, fontWeight:500, color:T.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                          {c.verified && <span style={{ fontSize:9, fontWeight:600, color:T.green, background:T.greenl, border:`1px solid ${T.greenb}`, padding:"1px 5px", borderRadius:2, letterSpacing:.5, flexShrink:0 }}>VERIFIED</span>}
                          {savedIds.has(c.id) && <span style={{ fontSize:10, color:T.amber, flexShrink:0 }}>★</span>}
                        </div>
                        <div style={{ fontSize:11, color:T.inkm, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                      </div>
                      <div style={{ fontSize:12, color:T.inkl, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.company}</div>
                      <div style={{ fontSize:11, color:T.inkm, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.industry}</div>
                      <div style={{ fontSize:11, color:T.inkm, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.location.split(",")[1]?.trim()||c.location}</div>
                      <div style={{ fontSize:11, color:T.inkm }}>{c.seniority}</div>
                      <div><ScorePill score={c.score} /></div>
                      <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
                        <button onClick={e=>{e.stopPropagation();setAiContact(c);}} style={{ width:26, height:26, background:T.greenl, border:`1px solid ${T.greenb}`, borderRadius:3, cursor:"pointer", fontSize:12, color:T.green, display:"flex", alignItems:"center", justifyContent:"center" }} title="AI Insights">✦</button>
                        <button onClick={e=>{e.stopPropagation();toggleSave(c);}} style={{ width:26, height:26, background:savedIds.has(c.id)?T.amberl:"#fff", border:`1px solid ${savedIds.has(c.id)?T.amberb:T.border}`, borderRadius:3, cursor:"pointer", fontSize:12, color:savedIds.has(c.id)?T.amber:T.inkmut, display:"flex", alignItems:"center", justifyContent:"center" }}>{savedIds.has(c.id)?"★":"☆"}</button>
                      </div>
                    </div>
                  ))}
                  {useLiveData && pdlHasMore && (
                    <button onClick={()=>runPDLSearch(pdlPage+1, true)} disabled={pdlLoading} style={{ width:"100%", padding:"10px", margin:"8px 0 16px", background:T.paper, border:`1px solid ${T.border}`, borderRadius:5, color:T.inkl, fontWeight:500, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                      {pdlLoading ? "Loading…" : "Load more contacts"}
                    </button>
                  )}
                  </>
                )}
              </div>
            </div>

            {/* Contact detail panel */}
            {selectedContact && (
              <div style={{ width:280, background:"#fff", borderLeft:`1px solid ${T.border}`, padding:20, overflowY:"auto", flexShrink:0, animation:"slideIn .2s ease" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:T.ink, lineHeight:1.2 }}>{selectedContact.name}</div>
                  <button onClick={()=>setSelectedContact(null)} style={{ background:"none", border:"none", color:T.inkmut, cursor:"pointer", fontSize:16 }}>×</button>
                </div>
                <div style={{ fontSize:12, color:T.inkm, marginBottom:4 }}>{selectedContact.title}</div>
                <div style={{ fontSize:13, fontWeight:500, color:T.green, marginBottom:16 }}>{selectedContact.company}</div>
                <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
                  <ScorePill score={selectedContact.score} />
                  {selectedContact.verified && <span style={{ fontSize:10, fontWeight:600, color:T.green, background:T.greenl, border:`1px solid ${T.greenb}`, padding:"2px 6px", borderRadius:2, letterSpacing:.5 }}>VERIFIED</span>}
                </div>
                {[["Industry",selectedContact.industry],["Location",selectedContact.location],["Employees",selectedContact.employees],["Revenue",selectedContact.revenue],["Seniority",selectedContact.seniority],["Department",selectedContact.department],["Email",selectedContact.email],["Phone",selectedContact.phone]].map(([l,v])=>(
                  <div key={l} style={{ marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:600, color:T.inkmut, textTransform:"uppercase", letterSpacing:.8, marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:12, color:T.inkl, wordBreak:"break-all" }}>{v||"—"}</div>
                  </div>
                ))}
                <div style={{ marginTop:4, marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.inkmut, textTransform:"uppercase", letterSpacing:.8, marginBottom:6 }}>Tags</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {selectedContact.tags.map(t=><span key={t} className="tag-chip">{t}</span>)}
                  </div>
                </div>
                <button onClick={()=>setAiContact(selectedContact)} style={{ width:"100%", padding:"9px", background:T.green, border:"none", borderRadius:4, color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>✦ AI Intelligence</button>
              </div>
            )}
          </div>
        )}

        {/* ── PIPELINE ────────────────────────────────────────────────── */}
        {view==="pipeline" && (
          <div style={{ flex:1, padding:"28px 32px", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
              <SectionHeading label="Pipeline" sub={savedContacts.length > 0 ? `${savedContacts.length} contacts across all stages` : "Star contacts in Discover to add them here"} />
              <button onClick={()=>setView("discover")} style={{ padding:"8px 16px", background:T.ink, border:"none", borderRadius:4, color:T.cream, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>+ Add contacts</button>
            </div>

            {savedContacts.length === 0 ? (
              <div style={{ textAlign:"center", padding:"80px 20px", background:"#fff", border:`1.5px dashed ${T.paperd}`, borderRadius:8 }}>
                <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:24, color:T.inkm, marginBottom:8 }}>Your pipeline is empty</div>
                <div style={{ fontSize:14, color:T.inkmut, marginBottom:20, lineHeight:1.7 }}>Star contacts in the Discover tab to add them to your pipeline. Then drag them through stages as you progress.</div>
                <button onClick={()=>setView("discover")} style={{ padding:"10px 24px", background:T.green, border:"none", borderRadius:4, color:"#fff", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Go to Discover →</button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, alignItems:"start" }}>
                {[
                  { stage:"New",       col:T.inkm,    bg:T.paper,   border:T.border,  icon:"◯" },
                  { stage:"Contacted", col:T.amber,   bg:T.amberl,  border:T.amberb,  icon:"✉" },
                  { stage:"Qualified", col:"#3466cc", bg:"#e8f3ff", border:"#bdd4fd", icon:"✓" },
                  { stage:"Closed",    col:T.green,   bg:T.greenl,  border:T.greenb,  icon:"★" },
                ].map(({ stage, col, bg, border, icon }) => {
                  const stageContacts = savedContacts.filter(c => (pipelineStages[c.id] || "New") === stage);
                  const isOver = dragOverStage === stage;
                  return (
                    <div key={stage}
                      onDragOver={e=>{ e.preventDefault(); setDragOverStage(stage); }}
                      onDragLeave={()=>setDragOverStage(null)}
                      onDrop={async e=>{ e.preventDefault(); setDragOverStage(null); if(draggedId) await moveToStage(draggedId, stage); setDraggedId(null); }}
                      style={{ minHeight:200, transition:"background .15s" }}>
                      {/* Column header */}
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, padding:"9px 12px", background:isOver?bg:"#fff", border:`1.5px solid ${isOver?col:border}`, borderRadius:5, transition:"all .15s" }}>
                        <span style={{ fontSize:14, color:col }}>{icon}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:col, flex:1 }}>{stage}</span>
                        <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", background:isOver?col:"rgba(0,0,0,.06)", color:isOver?"#fff":T.inkmut, padding:"1px 7px", borderRadius:3, transition:"all .15s" }}>{stageContacts.length}</span>
                      </div>

                      {/* Drop zone indicator */}
                      {isOver && (
                        <div style={{ border:`2px dashed ${col}`, borderRadius:5, padding:"12px", textAlign:"center", fontSize:12, color:col, marginBottom:8, background:bg }}>Drop here → {stage}</div>
                      )}

                      {/* Cards */}
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {stageContacts.map(c=>(
                          <div key={c.id}
                            draggable
                            onDragStart={()=>setDraggedId(c.id)}
                            onDragEnd={()=>{ setDraggedId(null); setDragOverStage(null); }}
                            style={{ background:"#fff", border:`1px solid ${draggedId===c.id?col:T.border}`, borderRadius:5, padding:"12px 14px", cursor:"grab", opacity:draggedId===c.id?.5:1, transition:"all .15s", boxShadow:draggedId===c.id?`0 4px 16px rgba(0,0,0,.12)`:"none" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:3 }}>
                              <div style={{ fontSize:13, fontWeight:600, color:T.ink, flex:1, marginRight:8 }}>{c.name}</div>
                              <ScorePill score={c.score} />
                            </div>
                            <div style={{ fontSize:11, color:T.inkm, marginBottom:2 }}>{c.title}</div>
                            <div style={{ fontSize:11, color:T.green, fontWeight:500, marginBottom:10 }}>{c.company}</div>
                            {/* Stage selector */}
                            <select value={pipelineStages[c.id]||"New"} onChange={async e=>await moveToStage(c.id, e.target.value)}
                              style={{ width:"100%", fontSize:11, padding:"3px 6px", border:`1px solid ${T.border}`, borderRadius:3, background:T.paper, color:T.inkl, fontFamily:"'DM Sans',sans-serif", marginBottom:8, cursor:"pointer", outline:"none" }}>
                              {["New","Contacted","Qualified","Closed"].map(s=><option key={s}>{s}</option>)}
                            </select>
                            <div style={{ display:"flex", gap:5 }}>
                              <button onClick={()=>setAiContact(c)} style={{ flex:1, fontSize:10, fontWeight:500, padding:"4px", background:T.greenl, border:`1px solid ${T.greenb}`, borderRadius:3, color:T.green, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>✦ AI</button>
                              <button onClick={()=>toggleSave(c)} style={{ flex:1, fontSize:10, fontWeight:500, padding:"4px", background:T.redl, border:`1px solid ${T.redb}`, borderRadius:3, color:T.red, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>✕ Remove</button>
                            </div>
                          </div>
                        ))}
                        {stageContacts.length === 0 && !isOver && (
                          <div style={{ border:`1.5px dashed ${T.paperd}`, borderRadius:5, padding:"16px", textAlign:"center", fontSize:11, color:T.inkmut }}>Drag contacts here</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LISTS ───────────────────────────────────────────────────── */}
        {view==="lists" && (
          <div style={{ flex:1, padding:"28px 32px", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
              <SectionHeading label="Lists" sub="Your saved prospect lists" />
              <button onClick={async()=>{
                const n = prompt("List name?");
                if (!n) return;
                try {
                  if (sbTeam && currentUser) {
                    const { data } = await sb.from("lists").insert({ team_id:sbTeam.id, created_by:currentUser.id, name:n }).select().single();
                    if (data) setLists(p=>[...p,{ id:data.id, name:n, count:0 }]);
                  } else {
                    setLists(p=>[...p,{ id:Date.now(), name:n, count:0 }]);
                  }
                } catch(e) { console.warn("List create error:", e); setLists(p=>[...p,{ id:Date.now(), name:n, count:0 }]); }
              }} style={{ padding:"8px 16px", background:T.ink, border:"none", borderRadius:4, color:T.cream, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>+ New list</button>
            </div>

            {/* Saved contacts */}
            {savedIds.size > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:600, color:T.green, textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>★ Saved contacts ({savedIds.size})</div>
                <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, overflow:"hidden" }}>
                  {MOCK_CONTACTS.filter(c=>savedIds.has(c.id)).map((c,i,arr)=>(
                    <div key={c.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 16px", borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none", background:i%2===0?"#fff":T.cream }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:T.ink }}>{c.name}</div>
                        <div style={{ fontSize:11, color:T.inkm }}>{c.title} · {c.company}</div>
                        <div style={{ fontSize:11, color:T.inkmut }}>{c.location}</div>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                        <ScorePill score={c.score} />
                        <button onClick={()=>setAiContact(c)} style={{ fontSize:11, padding:"4px 8px", background:T.greenl, border:`1px solid ${T.greenb}`, borderRadius:3, color:T.green, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>✦ AI</button>
                        <button onClick={()=>toggleSave(c.id)} style={{ fontSize:11, color:T.red, background:T.redl, border:`1px solid ${T.redb}`, borderRadius:3, padding:"4px 8px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {savedIds.size === 0 && lists.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 20px", background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, marginBottom:24 }}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:T.inkm, marginBottom:8 }}>No saved contacts yet</div>
                <div style={{ fontSize:13, color:T.inkmut, marginBottom:16 }}>Star contacts in the Discover tab to save them here.</div>
                <button onClick={()=>setView("discover")} style={{ padding:"8px 20px", background:T.ink, border:"none", borderRadius:4, color:T.cream, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Go to Discover →</button>
              </div>
            )}

            {/* Lists grid */}
            {lists.length > 0 && (
              <>
                <div style={{ fontSize:11, fontWeight:600, color:T.inkmut, textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>My lists ({lists.length})</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                  {lists.map(l=>(
                    <div key={l.id} style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, padding:"18px 20px", cursor:"pointer", transition:"border-color .15s" }}>
                      <div style={{ fontSize:10, fontWeight:600, color:T.inkmut, fontFamily:"'DM Mono',monospace", marginBottom:8 }}>LIST</div>
                      <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:T.ink, marginBottom:4 }}>{l.name}</div>
                      <div style={{ fontSize:12, color:T.inkm, marginBottom:12 }}>{l.count} contacts</div>
                      <button onClick={async()=>{
                        if (!window.confirm(`Delete list "${l.name}"?`)) return;
                        try {
                          if (sbTeam) await sb.from("lists").delete().eq("id", l.id);
                          setLists(p=>p.filter(x=>x.id!==l.id));
                        } catch(e) { setLists(p=>p.filter(x=>x.id!==l.id)); }
                      }} style={{ fontSize:11, color:T.inkmut, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", padding:0 }}>Delete</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TEAM ────────────────────────────────────────────────────── */}
        {view==="team" && (
          <div style={{ flex:1, padding:"28px 32px", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
              <SectionHeading label="Team" sub={`${teamMembers.filter(m=>m.status==="active").length} active · ${teamMembers.filter(m=>m.status==="invited").length} pending · ${activeBilling.seats.total-teamMembers.length} seats free`} />
              {perms.canInvite && <button onClick={()=>setShowInviteModal(true)} style={{ padding:"8px 16px", background:T.ink, border:"none", borderRadius:4, color:T.cream, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>+ Invite</button>}
            </div>

            {showInviteModal && (
              <div style={{ position:"fixed", inset:0, background:"rgba(26,24,20,.4)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setShowInviteModal(false)}>
                <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, padding:28, width:380, boxShadow:`0 8px 40px ${T.shadowd}` }} onClick={e=>e.stopPropagation()}>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:T.ink, marginBottom:4 }}>Invite member</div>
                  <div style={{ fontSize:13, color:T.inkm, marginBottom:20 }}>They'll receive an email invite to join.</div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Email address</label>
                    <input className="input-base" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:5 }}>Role</label>
                    <select className="input-base" value={inviteRole} onChange={e=>setInviteRole(e.target.value)}>
                      {Object.entries(ROLE_PERMISSIONS).map(([k,rp])=><option key={k} value={k}>{rp.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>setShowInviteModal(false)} style={{ flex:1, padding:"9px", background:T.paper, border:`1px solid ${T.border}`, borderRadius:4, color:T.inkl, fontWeight:500, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
                    <button onClick={sendInvite} style={{ flex:1, padding:"9px", background:T.ink, border:"none", borderRadius:4, color:T.cream, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Send invite</button>
                  </div>
                </div>
              </div>
            )}

            {/* Credit pool */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, padding:"16px 20px", marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontSize:13, fontWeight:500, color:T.ink }}>Shared credits</div>
                <div style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:T.inkm }}>{activeBilling.credits.used} / {activeBilling.credits.total} used</div>
              </div>
              <div style={{ height:4, background:T.paperd, borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.round(activeBilling.credits.used/activeBilling.credits.total*100)}%`, background:activeBilling.credits.used/activeBilling.credits.total>.8?T.amber:T.green, borderRadius:2 }} />
              </div>
            </div>

            {/* Members table */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto", padding:"8px 16px", background:T.paper, borderBottom:`1px solid ${T.border}` }}>
                {["Member","Role","Status","Searches","Exports",""].map(h=><div key={h} style={{ fontSize:10, fontWeight:600, color:T.inkmut, textTransform:"uppercase", letterSpacing:.8 }}>{h}</div>)}
              </div>
              {teamMembers.map(m=>{
                const rp = ROLE_PERMISSIONS[m.role];
                return (
                  <div key={m.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto", padding:"11px 16px", borderBottom:`1px solid ${T.border}`, alignItems:"center", background:m.id===activeUserId?T.greenl:"#fff" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:28, height:28, borderRadius:3, background:rp.bg, border:`1px solid ${rp.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:rp.color }}>{m.avatar}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:T.ink }}>{m.name}{m.id===activeUserId&&<span style={{ fontSize:10, color:T.green, marginLeft:6 }}>● you</span>}</div>
                        <div style={{ fontSize:11, color:T.inkmut }}>{m.email}</div>
                      </div>
                    </div>
                    <div>
                      {perms.canInvite&&m.id!==activeUserId
                        ? <select value={m.role} onChange={e=>setTeamMembers(p=>p.map(tm=>tm.id===m.id?{...tm,role:e.target.value}:tm))} style={{ fontSize:11, padding:"2px 6px", border:`1px solid ${rp.border}`, borderRadius:3, background:rp.bg, color:rp.color, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", outline:"none" }}>
                            {Object.entries(ROLE_PERMISSIONS).map(([k,r])=><option key={k} value={k}>{r.label}</option>)}
                          </select>
                        : <RoleBadge role={m.role} />}
                    </div>
                    <div><span style={{ fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:3, background:m.status==="active"?T.greenl:T.amberl, color:m.status==="active"?T.green:T.amber, border:`1px solid ${m.status==="active"?T.greenb:T.amberb}` }}>{m.status==="active"?"Active":"Invited"}</span></div>
                    <div style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:T.inkm }}>{m.searches}</div>
                    <div style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:T.inkm }}>{m.exports}</div>
                    <div>{perms.canInvite&&m.id!==activeUserId&&<button onClick={()=>setTeamMembers(p=>p.filter(tm=>tm.id!==m.id))} style={{ fontSize:11, color:T.red, background:T.redl, border:`1px solid ${T.redb}`, borderRadius:3, padding:"2px 8px", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Remove</button>}</div>
                  </div>
                );
              })}
            </div>

            {/* Role legend */}
            <div style={{ marginTop:20, background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, padding:"16px 20px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.inkmut, textTransform:"uppercase", letterSpacing:1, marginBottom:14 }}>Role permissions</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                {Object.entries(ROLE_PERMISSIONS).map(([key,rp])=>(
                  <div key={key} style={{ background:rp.bg, border:`1px solid ${rp.border}`, borderRadius:4, padding:"10px 12px" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:rp.color, marginBottom:8 }}>{rp.label}</div>
                    {[["Search","canSearch"],["Export","canExport"],["Manage Lists","canManageLists"],["View Team","canViewTeam"],["Invite","canInvite"],["Billing","canManageBilling"]].map(([l,k])=>(
                      <div key={k} style={{ fontSize:10, color:rp[k]?rp.color:T.inkmut, display:"flex", alignItems:"center", gap:4, marginBottom:3 }}><span>{rp[k]?"✓":"✕"}</span>{l}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BILLING ─────────────────────────────────────────────────── */}
        {view==="billing" && (
          <div style={{ flex:1, padding:"28px 32px", overflowY:"auto" }}>

            {/* ── CANCELLATION FLOW MODAL ─────────────────────────────── */}
            {showCancelFlow && (
              <div style={{ position:"fixed", inset:0, background:"rgba(26,24,20,.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>{ setShowCancelFlow(false); setCancelStep(1); setCancelError(""); setCancelPassword(""); }}>
                <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:8, padding:32, width:"100%", maxWidth:480, boxShadow:`0 8px 40px ${T.shadowd}` }} onClick={e=>e.stopPropagation()}>

                  {/* Step indicator */}
                  {!cancelComplete && (
                    <div style={{ display:"flex", gap:4, marginBottom:24 }}>
                      {[1,2,3,4].map(s=>(
                        <div key={s} style={{ flex:1, height:3, borderRadius:2, background:s<=cancelStep?T.red:T.paperd, transition:"background .3s" }} />
                      ))}
                    </div>
                  )}

                  {/* STEP 1 — What you'll lose */}
                  {cancelStep===1 && !cancelComplete && (
                    <>
                      <div style={{ fontSize:22, fontFamily:"'Instrument Serif',serif", color:T.ink, marginBottom:6 }}>Before you cancel</div>
                      <div style={{ fontSize:13, color:T.inkm, marginBottom:20, lineHeight:1.7 }}>Your account will remain active until the end of your current billing period. After that you will lose access to:</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
                        {[
                          [`${activeBilling.credits.total - activeBilling.credits.used} remaining credits`, T.green],
                          ["All saved contacts and lists", T.amber],
                          ["Team member access", T.amber],
                          ["AI Intelligence panel", T.green],
                          ["Export history", T.inkm],
                        ].map(([item, color])=>(
                          <div key={item} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:T.paper, borderRadius:5 }}>
                            <span style={{ color:T.red, fontSize:14 }}>✕</span>
                            <span style={{ fontSize:13, color:T.inkl }}>{item}</span>
                          </div>
                        ))}
                      </div>
                      {/* Offer downgrade first */}
                      <div style={{ background:T.greenl, border:`1px solid ${T.greenb}`, borderRadius:6, padding:"14px 16px", marginBottom:16 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:T.green, marginBottom:4 }}>💡 Consider downgrading instead</div>
                        <div style={{ fontSize:12, color:T.inkm, marginBottom:10 }}>Switch to our Starter plan at $39/mo and keep your contacts and data.</div>
                        <button onClick={()=>{ setShowCancelFlow(false); setAppView("pricing"); }} style={{ fontSize:12, fontWeight:600, padding:"6px 14px", background:T.green, border:"none", borderRadius:4, color:"#fff", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>View Starter plan →</button>
                      </div>
                      <div style={{ display:"flex", gap:10 }}>
                        <button onClick={()=>setShowCancelFlow(false)} style={{ flex:1, padding:"10px", background:T.paper, border:`1px solid ${T.border}`, borderRadius:5, color:T.inkl, fontWeight:500, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Keep my account</button>
                        <button onClick={()=>setCancelStep(2)} style={{ flex:1, padding:"10px", background:T.redl, border:`1px solid ${T.redb}`, borderRadius:5, color:T.red, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Continue to cancel →</button>
                      </div>
                    </>
                  )}

                  {/* STEP 2 — Reason */}
                  {cancelStep===2 && !cancelComplete && (
                    <>
                      <div style={{ fontSize:22, fontFamily:"'Instrument Serif',serif", color:T.ink, marginBottom:6 }}>Why are you leaving?</div>
                      <div style={{ fontSize:13, color:T.inkm, marginBottom:20 }}>Your feedback helps us improve. Please select the main reason.</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
                        {[
                          "Too expensive",
                          "Not enough contacts in my industry",
                          "Missing features I need",
                          "Switching to a competitor",
                          "No longer need the service",
                          "Technical issues",
                          "Other",
                        ].map(reason=>(
                          <button key={reason} onClick={()=>setCancelReason(reason)} style={{ padding:"10px 14px", textAlign:"left", background:cancelReason===reason?T.redl:T.paper, border:`1px solid ${cancelReason===reason?T.redb:T.border}`, borderRadius:5, fontSize:13, color:cancelReason===reason?T.red:T.inkl, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:cancelReason===reason?600:400, transition:"all .15s" }}>{reason}</button>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:10 }}>
                        <button onClick={()=>setCancelStep(1)} style={{ flex:1, padding:"10px", background:T.paper, border:`1px solid ${T.border}`, borderRadius:5, color:T.inkl, fontWeight:500, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
                        <button onClick={()=>{ if(!cancelReason){ setCancelError("Please select a reason."); return; } setCancelError(""); setCancelStep(3); }} style={{ flex:1, padding:"10px", background:T.red, border:"none", borderRadius:5, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Continue →</button>
                      </div>
                      {cancelError && <div style={{ fontSize:12, color:T.red, marginTop:8 }}>{cancelError}</div>}
                    </>
                  )}

                  {/* STEP 3 — Pause offer */}
                  {cancelStep===3 && !cancelComplete && (
                    <>
                      <div style={{ fontSize:22, fontFamily:"'Instrument Serif',serif", color:T.ink, marginBottom:6 }}>Would a pause help?</div>
                      <div style={{ fontSize:13, color:T.inkm, marginBottom:20, lineHeight:1.7 }}>Instead of cancelling, you can pause your account for up to 60 days. Your data stays safe and you can reactivate anytime.</div>
                      <div style={{ background:T.amberl, border:`1px solid ${T.amberb}`, borderRadius:6, padding:"16px", marginBottom:20 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:T.amber, marginBottom:4 }}>⏸ Pause your account</div>
                        <div style={{ fontSize:12, color:T.inkm, marginBottom:10 }}>No charges during pause. Resume anytime. All your data preserved.</div>
                        <button onClick={()=>{ alert("Account pause coming soon — contact support@zelvarix.ai to pause manually."); setShowCancelFlow(false); }} style={{ fontSize:12, fontWeight:600, padding:"6px 14px", background:T.amber, border:"none", borderRadius:4, color:"#fff", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Pause for 60 days →</button>
                      </div>
                      <div style={{ display:"flex", gap:10 }}>
                        <button onClick={()=>setCancelStep(2)} style={{ flex:1, padding:"10px", background:T.paper, border:`1px solid ${T.border}`, borderRadius:5, color:T.inkl, fontWeight:500, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
                        <button onClick={()=>setCancelStep(4)} style={{ flex:1, padding:"10px", background:T.redl, border:`1px solid ${T.redb}`, borderRadius:5, color:T.red, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>No thanks, cancel →</button>
                      </div>
                    </>
                  )}

                  {/* STEP 4 — Final confirm with password */}
                  {cancelStep===4 && !cancelComplete && (
                    <>
                      <div style={{ fontSize:22, fontFamily:"'Instrument Serif',serif", color:T.ink, marginBottom:6 }}>Confirm cancellation</div>
                      <div style={{ fontSize:13, color:T.inkm, marginBottom:6, lineHeight:1.7 }}>Please re-enter your password to confirm. Your account will remain active until <strong>{activeBilling.nextBill.date}</strong>.</div>
                      <div style={{ background:T.redl, border:`1px solid ${T.redb}`, borderRadius:5, padding:"10px 14px", marginBottom:16, fontSize:12, color:T.red }}>
                        ⚠ This action cannot be undone. All team members will be notified by email.
                      </div>
                      <div style={{ marginBottom:16 }}>
                        <label style={{ fontSize:12, fontWeight:500, color:T.inkl, display:"block", marginBottom:6 }}>Your password</label>
                        <input type="password" value={cancelPassword} onChange={e=>setCancelPassword(e.target.value)} placeholder="Enter your password to confirm" style={{ width:"100%", padding:"10px 12px", background:T.paper, border:`1px solid ${cancelError?T.red:T.border}`, borderRadius:5, color:T.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }} />
                        {cancelError && <div style={{ fontSize:12, color:T.red, marginTop:4 }}>{cancelError}</div>}
                      </div>
                      <div style={{ display:"flex", gap:10 }}>
                        <button onClick={()=>{ setCancelStep(3); setCancelError(""); }} style={{ flex:1, padding:"10px", background:T.paper, border:`1px solid ${T.border}`, borderRadius:5, color:T.inkl, fontWeight:500, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
                        <button onClick={async()=>{
                          if (!cancelPassword) { setCancelError("Please enter your password."); return; }
                          // Verify password by re-authenticating with Supabase
                          const { error } = await sb.auth.signInWithPassword({ email: currentUser.email, password: cancelPassword });
                          if (error) { setCancelError("Incorrect password. Please try again."); return; }
                          // Password correct — mark as cancelled
                          setCancelError("");
                          setCancelComplete(true);
                          // In production: call Stripe to cancel subscription
                          // await stripe.subscriptions.cancel(subscriptionId);
                        }} style={{ flex:1, padding:"10px", background:T.red, border:"none", borderRadius:5, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel my subscription</button>
                      </div>
                    </>
                  )}

                  {/* COMPLETE */}
                  {cancelComplete && (
                    <div style={{ textAlign:"center", padding:"20px 0" }}>
                      <div style={{ fontSize:40, marginBottom:16 }}>✓</div>
                      <div style={{ fontSize:22, fontFamily:"'Instrument Serif',serif", color:T.ink, marginBottom:8 }}>Cancellation confirmed</div>
                      <div style={{ fontSize:13, color:T.inkm, lineHeight:1.7, marginBottom:20 }}>
                        Your account will remain active until <strong>{activeBilling.nextBill.date}</strong>. You will receive a confirmation email shortly. All team members have been notified.
                      </div>
                      <div style={{ fontSize:12, color:T.inkm, background:T.paper, borderRadius:5, padding:"10px 14px", marginBottom:20, textAlign:"left" }}>
                        <strong>Changed your mind?</strong> Email <span style={{ color:T.green }}>support@zelvarix.ai</span> within 24 hours to reactivate your account with no data loss.
                      </div>
                      <button onClick={()=>{ setShowCancelFlow(false); setCancelStep(1); setCancelComplete(false); setCancelReason(""); setCancelPassword(""); }} style={{ padding:"10px 24px", background:T.ink, border:"none", borderRadius:5, color:T.cream, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Close</button>
                    </div>
                  )}

                </div>
              </div>
            )}

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
              <SectionHeading label="Billing" sub="Plan, seats, and usage" />
              <button onClick={()=>setAppView("pricing")} style={{ padding:"8px 16px", background:T.greenl, border:`1px solid ${T.greenb}`, borderRadius:4, color:T.green, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>↑ Upgrade plan</button>
            </div>
            {/* Plan */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
              <div style={{ background:"#fff", border:`2px solid ${T.greenb}`, borderRadius:5, padding:"18px 22px" }}>
                <div style={{ fontSize:10, fontWeight:600, color:T.green, textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>Current plan</div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:26, color:T.ink, marginBottom:4 }}>{activeBilling.plan}</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:28, color:T.green, marginBottom:4 }}>${activeBilling.nextBill.amount}<span style={{ fontSize:14, color:T.inkm, fontFamily:"'DM Sans',sans-serif" }}>/mo</span></div>
                <div style={{ fontSize:12, color:T.inkm }}>Next billing: {activeBilling.nextBill.date}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {/* Seats */}
                <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, padding:"14px 18px", flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:T.ink }}>Seats</div>
                    <div style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:T.inkm }}>{activeBilling.seats.used}/{activeBilling.seats.total}</div>
                  </div>
                  <div style={{ height:4, background:T.paperd, borderRadius:2, overflow:"hidden", marginBottom:8 }}>
                    <div style={{ height:"100%", width:`${Math.round(activeBilling.seats.used/activeBilling.seats.total*100)}%`, background:T.green, borderRadius:2 }} />
                  </div>
                  <div style={{ fontSize:11, color:T.inkmut }}>${activeBilling.seats.pricePerSeat}/seat/mo</div>
                </div>
                {/* Credits */}
                <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, padding:"14px 18px", flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:T.ink }}>Credits</div>
                    <div style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:T.inkm }}>{activeBilling.credits.used}/{activeBilling.credits.total}</div>
                  </div>
                  <div style={{ height:4, background:T.paperd, borderRadius:2, overflow:"hidden", marginBottom:8 }}>
                    <div style={{ height:"100%", width:`${Math.round(activeBilling.credits.used/activeBilling.credits.total*100)}%`, background:activeBilling.credits.used/activeBilling.credits.total>.8?T.amber:T.green, borderRadius:2 }} />
                  </div>
                  <div style={{ fontSize:11, color:T.inkmut }}>Resets {activeBilling.credits.resetDate}</div>
                </div>
              </div>
            </div>
            {/* History */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:5, overflow:"hidden" }}>
              <div style={{ padding:"12px 18px", borderBottom:`1px solid ${T.border}`, fontSize:13, fontWeight:500, color:T.ink }}>Billing history</div>
              {activeBilling.history.map((h,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 18px", borderBottom:i<activeBilling.history.length-1?`1px solid ${T.border}`:"none" }}>
                  <div style={{ fontSize:13, color:T.inkl }}>{h.date}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <span style={{ fontSize:10, fontWeight:600, color:T.green, background:T.greenl, border:`1px solid ${T.greenb}`, padding:"2px 7px", borderRadius:3, textTransform:"uppercase", letterSpacing:.5 }}>{h.status}</span>
                    <div style={{ fontSize:13, fontWeight:600, fontFamily:"'DM Mono',monospace", color:T.ink }}>${h.amount}</div>
                    <button style={{ fontSize:12, color:T.green, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>↓ PDF</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cancel subscription — Admin only */}
            {perms.canManageBilling ? (
              <div style={{ marginTop:24, padding:"16px 20px", background:T.redl, border:`1px solid ${T.redb}`, borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.red, marginBottom:2 }}>Cancel subscription</div>
                  <div style={{ fontSize:12, color:T.inkm }}>Only the account Admin can cancel. Your data is preserved for 30 days after cancellation.</div>
                </div>
                <button onClick={()=>{ setShowCancelFlow(true); setCancelStep(1); setCancelComplete(false); setCancelReason(""); setCancelPassword(""); setCancelError(""); }} style={{ padding:"8px 16px", background:"#fff", border:`1px solid ${T.redb}`, borderRadius:5, color:T.red, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>Cancel plan</button>
              </div>
            ) : (
              <div style={{ marginTop:24, padding:"14px 18px", background:T.paper, border:`1px solid ${T.border}`, borderRadius:6 }}>
                <div style={{ fontSize:13, color:T.inkm }}>🔒 Only the account Admin can cancel or modify the subscription. Contact your Admin to make changes.</div>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS VIEW ─────────────────────────────────────────────────── */}
        {view==="settings" && (
          <div style={{ flex:1, padding:"28px 32px", overflowY:"auto", paddingBottom:60 }}>
            <SectionHeading label="Settings" sub="Manage your account preferences and integrations" />

            {/* Booking Link */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, padding:"22px 24px", marginBottom:20 }}>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:T.ink, marginBottom:4 }}>Meeting booking link</div>
              <div style={{ fontSize:13, color:T.inkm, marginBottom:16, lineHeight:1.7 }}>Your Calendly or Cal.com booking link. When set, it's automatically appended to every AI-drafted outreach email so prospects can book a call directly.</div>
              <div style={{ display:"flex", gap:10 }}>
                <input className="input-base" value={bookingLink} onChange={e=>setBookingLink(e.target.value)} placeholder="https://calendly.com/your-name/30min" style={{ flex:1 }} />
                <button onClick={()=>{ localStorage.setItem('zelvarix_booking_link', bookingLink); alert('Booking link saved!'); }} style={{ padding:"9px 20px", background:T.green, border:"none", borderRadius:4, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>Save</button>
              </div>
              {bookingLink && (
                <div style={{ marginTop:10, fontSize:12, color:T.green }}>✓ Booking link active — will appear in AI-drafted emails</div>
              )}
            </div>

            {/* Profile info */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:6, padding:"22px 24px", marginBottom:20 }}>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:T.ink, marginBottom:16 }}>Account</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:T.inkl, marginBottom:4 }}>Email</div>
                  <div style={{ fontSize:13, color:T.inkm, padding:"9px 12px", background:T.paper, borderRadius:4, border:`1px solid ${T.border}` }}>{currentUser?.email || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:T.inkl, marginBottom:4 }}>Name</div>
                  <div style={{ fontSize:13, color:T.inkm, padding:"9px 12px", background:T.paper, borderRadius:4, border:`1px solid ${T.border}` }}>{displayName}</div>
                </div>
              </div>
            </div>

            {/* AI email limits info */}
            <div style={{ background:T.greenl, border:`1px solid ${T.greenb}`, borderRadius:6, padding:"18px 20px" }}>
              <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:18, color:T.ink, marginBottom:8 }}>AI bulk email generation</div>
              <div style={{ fontSize:13, color:T.inkl, lineHeight:1.8 }}>
                Generate personalised outreach emails for multiple contacts at once using Claude AI. Available in the Discover tab — select contacts then click "✦ Generate emails".<br/>
                <strong>Starter:</strong> Single contact AI only &nbsp;·&nbsp; <strong>Pro:</strong> Up to 10 contacts at once &nbsp;·&nbsp; <strong>Team:</strong> Unlimited
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── BULK EMAIL MODAL ──────────────────────────────────────────────── */}
      {showBulkEmail && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:8, width:"100%", maxWidth:680, maxHeight:"85vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"20px 24px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:T.ink }}>✦ AI bulk email generator</div>
                <div style={{ fontSize:13, color:T.inkm, marginTop:2 }}>{bulkEmailContacts.length} contacts selected</div>
              </div>
              <button onClick={()=>{ setShowBulkEmail(false); setBulkEmailResults({}); }} style={{ fontSize:20, background:"none", border:"none", cursor:"pointer", color:T.inkm }}>✕</button>
            </div>
            <div style={{ overflowY:"auto", flex:1 }}>
              {bulkEmailContacts.map(c => (
                <div key={c.id} style={{ padding:"16px 24px", borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>{c.name}</div>
                      <div style={{ fontSize:12, color:T.inkm }}>{c.title} · {c.company}</div>
                    </div>
                    {!bulkEmailResults[c.id] && !bulkEmailLoading && (
                      <button onClick={async()=>{
                        setBulkEmailLoading(true);
                        try {
                          const res = await fetch('/api/claude', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
                            model:"claude-sonnet-4-6", max_tokens:600,
                            messages:[{ role:"user", content:`Write a short, personalized cold outreach email to ${c.name}, ${c.title} at ${c.company}. Industry: ${c.industry}. Keep it under 100 words, conversational, not salesy. End with a call to action to book a 15-minute call.${bookingLink ? ` Include this booking link: ${bookingLink}` : ""} Sign off as ${displayName} from Zelvarix.` }]
                          })});
                          const data = await res.json();
                          const text = data.content?.[0]?.text || "Could not generate email.";
                          setBulkEmailResults(p=>({...p, [c.id]: text}));
                        } catch { setBulkEmailResults(p=>({...p, [c.id]: "Error generating email. Please try again."})); }
                        setBulkEmailLoading(false);
                      }} style={{ padding:"6px 14px", background:T.greenl, border:`1px solid ${T.greenb}`, borderRadius:4, color:T.green, fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
                        ✦ Generate
                      </button>
                    )}
                  </div>
                  {bulkEmailResults[c.id] && (
                    <div>
                      <div style={{ background:T.paper, border:`1px solid ${T.border}`, borderRadius:4, padding:"12px 14px", fontSize:13, color:T.inkl, lineHeight:1.7, whiteSpace:"pre-wrap", marginBottom:8 }}>{bulkEmailResults[c.id]}</div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={()=>{ navigator.clipboard.writeText(bulkEmailResults[c.id]); }} style={{ padding:"5px 12px", background:"#fff", border:`1px solid ${T.border}`, borderRadius:3, fontSize:11, color:T.inkm, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>📋 Copy</button>
                        <button onClick={()=>setBulkEmailResults(p=>{ const n={...p}; delete n[c.id]; return n; })} style={{ padding:"5px 12px", background:"#fff", border:`1px solid ${T.border}`, borderRadius:3, fontSize:11, color:T.inkm, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>↺ Regenerate</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding:"16px 24px", borderTop:`1px solid ${T.border}`, display:"flex", gap:10, justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:12, color:T.inkmut }}>Emails are AI-generated — review before sending</div>
              <button onClick={async()=>{
                setBulkEmailLoading(true);
                for (const c of bulkEmailContacts) {
                  if (bulkEmailResults[c.id]) continue;
                  try {
                    const res = await fetch('/api/claude', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
                      model:"claude-sonnet-4-6", max_tokens:600,
                      messages:[{ role:"user", content:`Write a short, personalized cold outreach email to ${c.name}, ${c.title} at ${c.company}. Industry: ${c.industry}. Keep it under 100 words, conversational, not salesy. End with a call to action to book a 15-minute call.${bookingLink ? ` Include this booking link: ${bookingLink}` : ""} Sign off as ${displayName} from Zelvarix.` }]
                    })});
                    const data = await res.json();
                    const text = data.content?.[0]?.text || "Could not generate email.";
                    setBulkEmailResults(p=>({...p, [c.id]: text}));
                  } catch { setBulkEmailResults(p=>({...p, [c.id]: "Error generating email."})); }
                }
                setBulkEmailLoading(false);
              }} style={{ padding:"10px 20px", background:T.green, border:"none", borderRadius:4, color:"#fff", fontWeight:600, fontSize:13, cursor:bulkEmailLoading?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", opacity:bulkEmailLoading?.6:1 }}>
                {bulkEmailLoading ? "Generating…" : `✦ Generate all ${bulkEmailContacts.length} emails`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer links in app */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"6px 24px", background:"rgba(250,248,244,.95)", borderTop:`1px solid ${T.border}`, display:"flex", gap:16, zIndex:10, backdropFilter:"blur(4px)" }}>
        {[["privacy","Privacy"],["terms","Terms"],["cookies","Cookies"],["security","Security"],["contact","Contact"],["about","About"]].map(([id,l])=>(
          <button key={id} onClick={()=>setAppView(id)} style={{ fontSize:11, color:T.inkmut, background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{l}</button>
        ))}
        <span style={{ fontSize:11, color:T.inkmut, marginLeft:"auto" }}>© 2026 Zelvarix.ai</span>
      </div>

      {/* AI Panel */}
      {aiContact && <AIPanel contact={aiContact} onClose={()=>setAiContact(null)} bookingLink={bookingLink} />}
    </div>
  );
}
