<?php

namespace App\App\Controller;

use App\App\Form\RealEstateCalculationFormType;
use App\Domain\Entity\RealEstateCalculation;
use App\Domain\Service\RealEstateCalculatorService;
use App\Infra\Repository\RealEstateCalculationRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class RealEstateCalculatorController extends AbstractController
{
    private RealEstateCalculatorService $calculatorService;
    private RealEstateCalculationRepository $repository;

    public function __construct(
        RealEstateCalculatorService $calculatorService,
        RealEstateCalculationRepository $repository
    ) {
        $this->calculatorService = $calculatorService;
        $this->repository = $repository;
    }

    #[Route('/', name: 'real_estate_calculator')]
    public function index(Request $request): Response
    {
        $calculation = new RealEstateCalculation();
        $form = $this->createForm(RealEstateCalculationFormType::class, $calculation);
        $form->handleRequest($request);

        $results = null;

        if ($form->isSubmitted() && $form->isValid()) {
            // Calculate the results
            $results = $this->calculatorService->calculateResults($calculation);
            
            // Set creation timestamp
            $calculation->setCreatedAt(new \DateTime());

            // Save to database
            $this->repository->save($calculation);

            $this->addFlash('success', 'Calculation saved successfully!');

            // Redirect to prevent form resubmission
            return $this->redirectToRoute('view_calculation', ['id' => $calculation->getId()]);
        }

        return $this->render('calculator/index.html.twig', [
            'form' => $form->createView(),
            'results' => $results,
            'calculation' => $calculation,
        ]);
    }

    #[Route('/history', name: 'calculation_history')]
    public function history(): Response
    {
        $calculations = $this->repository->findAllOrderedByDate();

        return $this->render('calculator/history.html.twig', [
            'calculations' => $calculations,
        ]);
    }

    #[Route('/calculation/{id}', name: 'view_calculation', requirements: ['id' => '\d+'])]
    public function viewCalculation(int $id): Response
    {
        $calculation = $this->repository->findById($id);
        
        if (!$calculation) {
            throw $this->createNotFoundException('Calculation not found');
        }

        $results = $this->calculatorService->calculateResults($calculation);

        return $this->render('calculator/view.html.twig', [
            'calculation' => $calculation,
            'results' => $results,
        ]);
    }

    #[Route('/calculation/{id}/delete', name: 'delete_calculation', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function deleteCalculation(int $id): Response
    {
        $calculation = $this->repository->findById($id);
        
        if (!$calculation) {
            throw $this->createNotFoundException('Calculation not found');
        }

        $this->repository->delete($calculation);
        $this->addFlash('success', 'Calculation deleted successfully!');

        return $this->redirectToRoute('calculation_history');
    }
}
