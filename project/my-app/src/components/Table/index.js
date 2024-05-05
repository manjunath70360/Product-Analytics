const TruncatedTableCell = (props) => {
    const { text, maxLength } = props;
    let truncatedText =
      text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
      if (text===false){
        truncatedText = 0;
      }else if(text===true){
        truncatedText = 1;
      }
  
    return <td>{truncatedText}</td>;
  };
  
  export default TruncatedTableCell;
  
