
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Package, Service, Lead } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LogActivityDialog } from '../actions/log-activity-dialog';

interface PackageDetailDialogProps {
  pkg: Package;
  services: Service[];
  leads: Lead[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PackageDetailDialog({ pkg, services, leads, isOpen, onOpenChange }: PackageDetailDialogProps) {
  const [discountPercent, setDiscountPercent] = useState(0);

  const includedServices = useMemo(() => {
    return services.filter(s => pkg.serviceIds.includes(s.id));
  }, [services, pkg.serviceIds]);

  const originalPriceLKR = pkg.priceLKR;
  const discountedPriceLKR = originalPriceLKR - (originalPriceLKR * discountPercent) / 100;

  useEffect(() => {
    // Reset discount when package changes
    setDiscountPercent(0);
  }, [pkg]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pkg.name}</DialogTitle>
          <DialogDescription>
            Package ID: #{pkg.packageId} &middot; <Badge variant={pkg.category === 'fixed' ? 'default' : 'secondary'} className="capitalize">{pkg.category}</Badge>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left Column */}
          <div>
            <p className="text-sm text-muted-foreground">{pkg.description}</p>
            <Separator className="my-4" />
            <h4 className="font-semibold mb-2">Included Services</h4>
            <ul className="space-y-1 text-sm list-disc list-inside">
              {includedServices.map(service => (
                <li key={service.id}>{service.name}</li>
              ))}
            </ul>
             <Separator className="my-4" />
             <div className="text-sm">
                <span className='font-semibold'>Duration:</span> {pkg.duration}
             </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Discount Calculator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="discount-slider">Discount Percentage: {discountPercent}%</Label>
                    <Slider
                      id="discount-slider"
                      min={0}
                      max={100}
                      step={1}
                      value={[discountPercent]}
                      onValueChange={(value) => setDiscountPercent(value[0])}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Original Price:</span>
                      <span>{originalPriceLKR.toLocaleString('en-LK', { style: 'currency', currency: 'LKR' })}</span>
                    </div>
                     {discountPercent > 0 && (
                        <div className="flex justify-between text-sm text-destructive">
                            <span className="text-muted-foreground">Discount:</span>
                            <span>- {(originalPriceLKR - discountedPriceLKR).toLocaleString('en-LK', { style: 'currency', currency: 'LKR' })}</span>
                        </div>
                     )}
                    <div className="flex justify-between font-bold text-lg">
                      <span>Final Price:</span>
                      <span>{discountedPriceLKR.toLocaleString('en-LK', { style: 'currency', currency: 'LKR' })}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <LogActivityDialog
                        leads={leads}
                        services={services}
                        packages={[pkg]}
                    />
                </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
