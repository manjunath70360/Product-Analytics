import {useEffect} from 'react'

import './index.css'

const TruncatedTableCell = props => {
  const {text, maxLength, image} = props

  useEffect(() => {
    console.log(text)
  }, [text])

  const truncatedText =
    text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  const isImage = image === 'true'

  const content = isImage ? (
    <img src={text} alt="img" className="logo" />
  ) : (
    <td>{truncatedText}</td>
  )

  return <>{content}</>
}

export default TruncatedTableCell
