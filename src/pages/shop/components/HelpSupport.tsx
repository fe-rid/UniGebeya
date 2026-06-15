import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, Mail, Phone, MessageSquare, ExternalLink } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface HelpSupportProps {
  shop: any;
}

export function HelpSupport({ shop }: HelpSupportProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Help & Support</h2>
        <p className="text-muted-foreground">Find answers to common questions or contact our support team.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Quick answers to the most common questions from shopkeepers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I manage my inventory?</AccordionTrigger>
                <AccordionContent>
                  You can manage your inventory from the "Inventory" tab. There you can see your current stock levels and update them. If you add a new product, you can set the initial stock quantity from the "Products" tab.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>When do I get paid?</AccordionTrigger>
                <AccordionContent>
                  Payments are processed on a weekly basis. All revenue from completed orders from Monday to Sunday will be transferred to your registered bank account by the following Wednesday.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>How can I run a promotion?</AccordionTrigger>
                <AccordionContent>
                  Go to the "Promotions" tab and select any product. You can set a temporary "Discount Price" which will be highlighted to students on the app, helping you drive more sales.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>What happens if a runner doesn't show up?</AccordionTrigger>
                <AccordionContent>
                  If a runner accepts an order but doesn't arrive within 15 minutes, the system will automatically reassign the order to another nearby runner. You can track this in the "Delivery Tracking" tab.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
              <CardDescription>Need more help? We're here for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Call Support</p>
                  <p className="text-muted-foreground">+251 911 234 567</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-muted-foreground">shop@unigebeya.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Live Chat</p>
                  <p className="text-muted-foreground">Available 8 AM - 8 PM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-3 bg-muted rounded-full">
                <ExternalLink className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Shopkeeper Guide</p>
                <p className="text-xs text-muted-foreground mt-1">Download our comprehensive guide to maximizing your sales on Uni Gebeya.</p>
              </div>
              <Button variant="outline" className="w-full">Download PDF</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
