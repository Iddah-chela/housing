import React from 'react'
import Hero from '../components/Hero'
import FeaturedHouses from '../components/FeaturedHouses'
import HowItWorks from '../components/HowItWorks'
import Newsletter from '../components/Newsletter'

const home = () => {
  return (
    <>
        <Hero/>
        <FeaturedHouses/>
        <HowItWorks/>
        <Newsletter/>
    </>
  )
}

export default home
