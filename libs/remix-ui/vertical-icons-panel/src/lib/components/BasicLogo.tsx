import React from 'react'
import StudioLogo from './Logo'
interface BasicLogoProps {
  classList?: string
  solid?: boolean
}

function BasicLogo({classList = '', solid = true}: BasicLogoProps) {
  if (solid) {
    return <StudioLogo />
  } else {
    return <img className="" src="assets/img/aelf_studio_icon_light.webp" style={{height: '3rem'}} alt=""></img>
  }
}

export default BasicLogo
