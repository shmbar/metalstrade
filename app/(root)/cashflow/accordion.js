import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion"

const MyAccordion = ({ title, children }) => {
  return (
    <Accordion type="single" collapsible className="w-full ">
      <AccordionItem value="item-1" className='border-b-0'>
        <AccordionTrigger className='py-0 px-0 hover:no-underline rounded-lg [&>svg]:hidden'>{title}</AccordionTrigger>
        <AccordionContent>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default MyAccordion;
