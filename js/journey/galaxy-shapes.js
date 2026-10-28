// Shared stellar distributions: silhouettes come from stars, never billboard halos.
export const GALAXY_TYPES=['spiral','barred','elliptical','lenticular','irregular','ring','merger'];
export function galaxyShape(radius,count,rand,type){
 const positions=[],colors=[],sizes=[],arms=2+Math.floor(rand()*3),twist=3+rand()*5,stretch=.65+rand()*.65;
 for(let i=0;i<count;i++){
  const a=rand()*Math.PI*2,u=rand()*2-1;let r=Math.pow(rand(),.65)*radius,x,y,z,warm=false;
  if(type==='elliptical'){
   r=Math.pow(rand(),1.25)*radius; x=Math.cos(a)*r*Math.sqrt(1-u*u)*1.4;y=u*r*.75;z=Math.sin(a)*r*Math.sqrt(1-u*u)*stretch;warm=true;
  }else if(type==='irregular'){
   const k=i%4,cx=Math.sin(k*2.4)*radius*.6,cz=Math.cos(k*3.7)*radius*.5;
   x=cx+(rand()-.5)*radius*.65;y=(rand()-.5)*radius*.28;z=cz+(rand()-.5)*radius*.5;
  }else if(type==='ring'){
   r=radius*(.78+rand()*.2);x=Math.cos(a)*r;y=(rand()-.5)*radius*.045;z=Math.sin(a)*r;
   if(i%9===0){x*=.12;y*=2;z*=.12;warm=true;}
  }else if(type==='lenticular'){
   x=Math.cos(a)*r;y=(rand()-.5)*radius*.045;z=Math.sin(a)*r;warm=true;
   if(i%3===0){x*=.3;z*=.3;y=u*radius*.18;}
  }else if(type==='merger'){
   const side=i%2?1:-1,t=r/radius,theta=a*.16+t*5+side*2;
   x=side*radius*.42+Math.cos(theta)*r*.65;y=Math.sin(t*3)*radius*.12*side;z=Math.sin(theta)*r*.6; x+=(rand()-.5)*radius*.12;z+=(rand()-.5)*radius*.12;
   if(i%4===0){x=side*radius*(.6+t*1.1);z=Math.sin(t*3)*radius*.65*side;}
  }else{
   const theta=i%6===0?a:(i%arms)*Math.PI*2/arms+r/radius*twist+(rand()-.5)*.65;
   x=Math.cos(theta)*r;y=(rand()-.5)*radius*.035;z=Math.sin(theta)*r;
   if(type==='barred'&&i%3===0){x=(rand()-.5)*radius*1.25;z=(rand()-.5)*radius*.12;warm=true;}
   else if(i%7===0){x*=.18;z*=.18;y=u*radius*.08;warm=true;}
  }
  const b=.65+rand()*.5;positions.push(x,y,z);
  colors.push(...(warm?[b,b*.75,b*.45]:i%13===0?[b,b*.35,b*.65]:[b*.55,b*.72,b]));sizes.push(.25+rand()*.65);
 }
 return {positions,colors,sizes};
}
