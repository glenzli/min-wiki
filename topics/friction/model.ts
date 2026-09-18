export function sliding(initialSpeed:number,mu:number,time:number){if(initialSpeed<0||mu<=0||time<0)throw new RangeError('invalid sliding conditions');const a=mu*9.81,t=Math.min(time,initialSpeed/a);return {distance:initialSpeed*t-.5*a*t*t,speed:time>=initialSpeed/a?0:Math.max(0,initialSpeed-a*t)};}

/** Fractions of initial kinetic energy in the constant-friction teaching model. */
export function energyState(initialSpeed:number,mu:number,time:number){
 const state=sliding(initialSpeed,mu,time);
 const kinetic=initialSpeed===0?0:(state.speed/initialSpeed)**2;
 const transferred=initialSpeed===0?0:Math.min(1,2*mu*9.81*state.distance/(initialSpeed**2));
 return {...state,kinetic,transferred};
}
