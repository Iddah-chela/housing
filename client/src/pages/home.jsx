import React from 'react'
import Hero from '../components/Hero'
import FeaturedHouses from '../components/FeaturedHouses'
import WhyChooseUs from '../components/WhyChooseUs'
import HowItWorks from '../components/HowItWorks'
import Newsletter from '../components/Newsletter'

const home = () => {
  return (
    <>
        <Hero/>
        <FeaturedHouses/>
        <WhyChooseUs/>
        <HowItWorks/>
        <Newsletter/>
    </>
  )
}

export default home