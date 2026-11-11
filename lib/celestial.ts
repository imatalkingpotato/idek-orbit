// Decorative heliocentric view, not an observer's sky chart.
// Earth/EM barycentre elements: https://ssd.jpl.nasa.gov/planets/approx_pos.html
// Mean lunation: https://eclipse.gsfc.nasa.gov/phase/phase2001cst.html
const DAY=86400000,TAU=Math.PI*2,RAD=Math.PI/180;
const wrap=(n:number)=>((n%TAU)+TAU)%TAU;
export const DISPLAY_DAYS_PER_SECOND=3;
export function celestialAngles(now:number){
 const T=(now-Date.UTC(2000,0,1,12))/(DAY*36525);
 const e=.01671123-.00004392*T,peri=(102.93768193+.32327364*T)*RAD;
 const mean=wrap((100.46457166+35999.37244981*T)*RAD-peri);
 let E=mean;for(let i=0;i<6;i++)E-=(E-e*Math.sin(E)-mean)/(1-e*Math.cos(E));
 const earth=wrap(Math.atan2(Math.sqrt(1-e*e)*Math.sin(E),Math.cos(E)-e)+peri);
 const phase=wrap((now-Date.UTC(2000,0,6,18,15))/DAY/29.530588*TAU);
 return {earth,moon:wrap(earth+Math.PI+phase)};
}
