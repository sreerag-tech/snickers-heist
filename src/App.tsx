import { useState}  from "react";



function App(){
  const[x, setX] = useState(0);
  const[y, setY] = useState(0);
  return(
    <div>
      <div 
      style={{
        width: "100px",
        height: "100px",
        backgroundColor:"blue",
       position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
      }}
      ></div>

      <div>
       <button onClick={()=>setX(x+50)}>
        move right
       </button> 
       </div>

       <div>
       <button onClick={()=>{if(x>0){
        setX(x-50)}}}>
        move left
       </button> 
       </div>

       <div>
       <button onClick={()=>setY(y+50)}>
        move down
       </button> 
       </div>
        
        <div>
       <button onClick={()=>{if(y>0){
        setY(y-50)}}}>
        move up
       </button> 
       </div>
       </div>
       
    
  
    
  )
}
export default App